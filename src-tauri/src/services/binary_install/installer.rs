use super::{bin_dir, place_artifact, Downloader, ReleaseArtifact};
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::process::Output;
use std::time::Duration;
use tracing::{info, instrument, warn};

const WORKSPACE_PREFIX: &str = ".nookat-install-";
const SYSTEM_PATH: &str = "/usr/bin:/bin:/usr/sbin:/sbin";
const VERSION_CHECK_TIMEOUT: Duration = Duration::from_secs(30);
const BUSY_EXECUTABLE_ATTEMPTS: u32 = 20;
const BUSY_EXECUTABLE_PAUSE: Duration = Duration::from_millis(50);
const BYTES_PER_MB: u64 = 1_000_000;

#[derive(Debug, Clone, PartialEq)]
pub enum InstallEvent<'a> {
    Downloading {
        artifact: &'a ReleaseArtifact,
        received: u64,
        total: u64,
    },
    Verified {
        artifact: &'a ReleaseArtifact,
    },
    Unpacking,
    Checked {
        artifact: &'a ReleaseArtifact,
        version_output: String,
    },
    Activated,
}

pub fn required_disk_bytes(releases: &[ReleaseArtifact]) -> u64 {
    releases
        .iter()
        .map(|artifact| artifact.download_bytes + artifact.unpacked_bytes)
        .sum()
}

pub fn ensure_enough_space(available: u64, required: u64, dir: &Path) -> Result<(), String> {
    if available >= required {
        return Ok(());
    }

    Err(format!(
        "Not enough free disk space in {:?}: the installation needs {} MB and {} MB are free",
        dir,
        required.div_ceil(BYTES_PER_MB),
        available / BYTES_PER_MB
    ))
}

#[instrument(skip_all, err)]
pub async fn install_releases<'a>(
    downloader: &Downloader,
    releases: &'a [ReleaseArtifact],
    prefix: &Path,
    mut on_event: impl FnMut(InstallEvent<'a>),
) -> Result<(), String> {
    let parent = prefix
        .parent()
        .ok_or_else(|| format!("{:?} has no parent directory", prefix))?;
    std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create {:?}: {}", parent, e))?;
    remove_leftover_workspaces(parent);
    ensure_enough_space(
        available_disk_bytes(parent)?,
        required_disk_bytes(releases),
        parent,
    )?;

    let workspace = tempfile::Builder::new()
        .prefix(WORKSPACE_PREFIX)
        .tempdir_in(parent)
        .map_err(|e| {
            format!(
                "Failed to create a download directory in {:?}: {}",
                parent, e
            )
        })?;
    let staging = workspace.path().join("staging");

    let mut downloads = Vec::with_capacity(releases.len());
    for (index, artifact) in releases.iter().enumerate() {
        let download = workspace.path().join(format!("download-{index}"));
        info!(
            "Downloading {} {} from {}",
            artifact.name, artifact.version, artifact.url
        );
        downloader
            .download_verified(artifact, &download, &mut |received, total| {
                on_event(InstallEvent::Downloading {
                    artifact,
                    received,
                    total,
                })
            })
            .await?;
        info!(
            "Verified the SHA-256 digest of {} {}",
            artifact.name, artifact.version
        );
        on_event(InstallEvent::Verified { artifact });
        downloads.push((artifact.clone(), download));
    }

    on_event(InstallEvent::Unpacking);
    let unpack_into = staging.clone();
    tokio::task::spawn_blocking(move || {
        downloads
            .iter()
            .try_for_each(|(artifact, download)| place_artifact(download, artifact, &unpack_into))
    })
    .await
    .map_err(|e| format!("Unpacking stopped unexpectedly: {}", e))??;

    for artifact in releases {
        let version_output = run_version_check(&staging, artifact).await?;
        info!("{} runs: {}", artifact.name, version_output);
        on_event(InstallEvent::Checked {
            artifact,
            version_output,
        });
    }

    activate(&staging, prefix, workspace.path())?;
    info!("Installed the engine binaries into {:?}", prefix);
    on_event(InstallEvent::Activated);
    Ok(())
}

fn available_disk_bytes(dir: &Path) -> Result<u64, String> {
    let stats = rustix::fs::statvfs(dir)
        .map_err(|e| format!("Failed to read the free disk space of {:?}: {}", dir, e))?;
    Ok(stats.f_bavail * stats.f_frsize)
}

async fn run_version_check(prefix: &Path, artifact: &ReleaseArtifact) -> Result<String, String> {
    let bin = bin_dir(prefix);
    let executable = bin.join(artifact.check_command);
    let mut version_command = tokio::process::Command::new(&executable);
    version_command
        .arg("--version")
        .env("PATH", format!("{}:{}", bin.display(), SYSTEM_PATH));
    let output = tokio::time::timeout(
        VERSION_CHECK_TIMEOUT,
        output_once_no_one_writes_to_the_executable(&mut version_command),
    )
    .await
    .map_err(|_| format!("{} --version did not finish", artifact.check_command))?
    .map_err(|e| format!("{} does not run on this Mac: {}", artifact.name, e))?;

    if !output.status.success() {
        return Err(format!(
            "{} does not run on this Mac: {}",
            artifact.name,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

async fn output_once_no_one_writes_to_the_executable(
    command: &mut tokio::process::Command,
) -> std::io::Result<Output> {
    let mut attempt = 1;
    loop {
        match command.output().await {
            Err(e)
                if e.kind() == ErrorKind::ExecutableFileBusy
                    && attempt < BUSY_EXECUTABLE_ATTEMPTS =>
            {
                attempt += 1;
                tokio::time::sleep(BUSY_EXECUTABLE_PAUSE).await;
            }
            result => return result,
        }
    }
}

fn activate(staging: &Path, prefix: &Path, workspace: &Path) -> Result<(), String> {
    let previous = workspace.join("previous");
    let replaced_previous = match std::fs::rename(prefix, &previous) {
        Ok(()) => true,
        Err(e) if e.kind() == ErrorKind::NotFound => false,
        Err(e) => {
            return Err(format!(
                "Failed to move the previous installation at {:?} aside: {}",
                prefix, e
            ))
        }
    };

    if let Err(e) = std::fs::rename(staging, prefix) {
        if replaced_previous {
            restore_previous(&previous, prefix);
        }
        return Err(format!("Failed to install into {:?}: {}", prefix, e));
    }

    Ok(())
}

fn restore_previous(previous: &Path, prefix: &Path) {
    if let Err(e) = std::fs::rename(previous, prefix) {
        warn!(
            "Failed to restore the previous installation from {:?}: {}",
            previous, e
        );
    }
}

fn remove_leftover_workspaces(parent: &Path) {
    for leftover in leftover_workspaces(parent) {
        info!(
            "Removing {:?} left by an interrupted installation",
            leftover
        );
        if let Err(e) = std::fs::remove_dir_all(&leftover) {
            warn!("Failed to remove {:?}: {}", leftover, e);
        }
    }
}

fn leftover_workspaces(parent: &Path) -> Vec<PathBuf> {
    std::fs::read_dir(parent)
        .map(|entries| {
            entries
                .flatten()
                .map(|entry| entry.path())
                .filter(|path| {
                    path.file_name()
                        .and_then(|name| name.to_str())
                        .is_some_and(|name| name.starts_with(WORKSPACE_PREFIX))
                })
                .collect()
        })
        .unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::ColimaArchitecture;
    use crate::services::binary_install::test_fixtures::{tar_gz, FileServer, Fixture};
    use crate::services::binary_install::{pinned_releases, ArtifactLayout};
    use sha2::{Digest, Sha256};
    use std::borrow::Cow;
    use std::fs;
    use std::os::unix::fs::PermissionsExt;

    const COLIMA_SCRIPT: &[u8] = b"#!/bin/sh\necho \"colima version v0.10.3\"\n";
    const LIMACTL_SCRIPT: &[u8] = b"#!/bin/sh\necho \"limactl version 2.2.1\"\n";
    const DOCKER_SCRIPT: &[u8] = b"#!/bin/sh\necho \"Docker version 29.10.0\"\n";
    const BROKEN_SCRIPT: &[u8] = b"#!/bin/sh\necho \"bad CPU type\" >&2\nexit 1\n";

    struct Releases {
        _sources: tempfile::TempDir,
        server: FileServer,
        releases: Vec<ReleaseArtifact>,
    }

    fn sha256_hex(bytes: &[u8]) -> String {
        hex::encode(Sha256::digest(bytes))
    }

    async fn serve_releases(colima: &[u8]) -> Releases {
        let sources = tempfile::tempdir().unwrap();
        let lima_archive = sources.path().join("lima.tar.gz");
        tar_gz(
            &lima_archive,
            &[
                Fixture::executable("./bin/limactl", LIMACTL_SCRIPT),
                Fixture::file("./share/lima/lima-guestagent.Linux-aarch64.gz", b"agent"),
            ],
        );
        let docker_archive = sources.path().join("docker.tgz");
        tar_gz(
            &docker_archive,
            &[Fixture::executable("docker/docker", DOCKER_SCRIPT)],
        );

        let files = [
            ("/colima", colima.to_vec()),
            ("/lima.tar.gz", fs::read(&lima_archive).unwrap()),
            ("/docker.tgz", fs::read(&docker_archive).unwrap()),
        ];
        let server = FileServer::default();
        for (path, contents) in &files {
            server.serve(path, contents.clone());
        }
        let base_url = server.start().await;

        let layouts = [
            (
                "Colima",
                ArtifactLayout::Executable {
                    install_as: "colima",
                },
                "colima",
            ),
            ("Lima", ArtifactLayout::PrefixArchive, "limactl"),
            (
                "Docker CLI",
                ArtifactLayout::ArchivedExecutable {
                    path_in_archive: "docker/docker",
                    install_as: "docker",
                },
                "docker",
            ),
        ];
        let releases = files
            .iter()
            .zip(layouts)
            .map(
                |((path, contents), (name, layout, check_command))| ReleaseArtifact {
                    name,
                    version: "1.0.0",
                    url: Cow::Owned(format!("{base_url}{path}")),
                    sha256: Cow::Owned(sha256_hex(contents)),
                    download_bytes: contents.len() as u64,
                    unpacked_bytes: contents.len() as u64,
                    layout,
                    check_command,
                },
            )
            .collect();

        Releases {
            _sources: sources,
            server,
            releases,
        }
    }

    fn fast_downloader() -> Downloader {
        Downloader::with_retry_backoff(Duration::from_millis(1)).unwrap()
    }

    fn entries(dir: &Path) -> Vec<String> {
        let mut names: Vec<String> = fs::read_dir(dir)
            .unwrap()
            .flatten()
            .map(|entry| entry.file_name().to_string_lossy().to_string())
            .collect();
        names.sort();
        names
    }

    fn previous_installation(prefix: &Path) {
        fs::create_dir_all(prefix.join("bin")).unwrap();
        fs::write(prefix.join("bin/colima"), b"previous").unwrap();
    }

    #[tokio::test]
    async fn installs_every_release_into_the_prefix_once_each_binary_runs() {
        let served = serve_releases(COLIMA_SCRIPT).await;
        let home = tempfile::tempdir().unwrap();
        let prefix = home.path().join("engine");
        let mut events = Vec::new();

        install_releases(&fast_downloader(), &served.releases, &prefix, |event| {
            if !matches!(event, InstallEvent::Downloading { .. }) {
                events.push(event)
            }
        })
        .await
        .unwrap();

        assert_eq!(fs::read(prefix.join("bin/colima")).unwrap(), COLIMA_SCRIPT);
        assert_eq!(
            fs::read(prefix.join("bin/limactl")).unwrap(),
            LIMACTL_SCRIPT
        );
        assert_eq!(fs::read(prefix.join("bin/docker")).unwrap(), DOCKER_SCRIPT);
        assert!(prefix
            .join("share/lima/lima-guestagent.Linux-aarch64.gz")
            .exists());
        assert_eq!(entries(home.path()), ["engine"]);

        let releases = &served.releases;
        assert_eq!(
            events,
            [
                InstallEvent::Verified {
                    artifact: &releases[0]
                },
                InstallEvent::Verified {
                    artifact: &releases[1]
                },
                InstallEvent::Verified {
                    artifact: &releases[2]
                },
                InstallEvent::Unpacking,
                InstallEvent::Checked {
                    artifact: &releases[0],
                    version_output: "colima version v0.10.3".to_string()
                },
                InstallEvent::Checked {
                    artifact: &releases[1],
                    version_output: "limactl version 2.2.1".to_string()
                },
                InstallEvent::Checked {
                    artifact: &releases[2],
                    version_output: "Docker version 29.10.0".to_string()
                },
                InstallEvent::Activated,
            ]
        );
    }

    #[tokio::test]
    async fn runs_a_binary_that_another_process_holds_open_for_writing_a_moment_longer() {
        let served = serve_releases(COLIMA_SCRIPT).await;
        let prefix = tempfile::tempdir().unwrap();
        let colima = bin_dir(prefix.path()).join("colima");
        fs::create_dir_all(colima.parent().unwrap()).unwrap();
        fs::write(&colima, COLIMA_SCRIPT).unwrap();
        fs::set_permissions(&colima, fs::Permissions::from_mode(0o755)).unwrap();
        let writer = fs::OpenOptions::new().append(true).open(&colima).unwrap();
        let other_process_lets_go = std::thread::spawn(move || {
            std::thread::sleep(Duration::from_millis(200));
            drop(writer);
        });

        let version = run_version_check(prefix.path(), &served.releases[0]).await;

        other_process_lets_go.join().unwrap();
        assert_eq!(version, Ok("colima version v0.10.3".to_string()));
    }

    #[tokio::test]
    async fn reports_download_progress_up_to_the_full_size() {
        let served = serve_releases(COLIMA_SCRIPT).await;
        let home = tempfile::tempdir().unwrap();
        let mut last_progress = None;

        install_releases(
            &fast_downloader(),
            &served.releases[..1],
            &home.path().join("engine"),
            |event| {
                if let InstallEvent::Downloading {
                    received, total, ..
                } = event
                {
                    last_progress = Some((received, total));
                }
            },
        )
        .await
        .unwrap();

        let size = COLIMA_SCRIPT.len() as u64;
        assert_eq!(last_progress, Some((size, size)));
    }

    #[tokio::test]
    async fn a_download_that_does_not_match_its_digest_installs_nothing() {
        let mut served = serve_releases(COLIMA_SCRIPT).await;
        served.releases[1].sha256 = Cow::Owned(sha256_hex(b"something else"));
        let home = tempfile::tempdir().unwrap();
        let prefix = home.path().join("engine");
        previous_installation(&prefix);

        let error = install_releases(&fast_downloader(), &served.releases, &prefix, |_| {})
            .await
            .expect_err("must fail");

        assert!(
            error.contains("does not match its pinned SHA-256"),
            "{error}"
        );
        assert_eq!(fs::read(prefix.join("bin/colima")).unwrap(), b"previous");
        assert!(!prefix.join("bin/limactl").exists());
        assert_eq!(entries(home.path()), ["engine"]);
    }

    #[tokio::test]
    async fn a_binary_that_does_not_run_on_this_mac_installs_nothing() {
        let served = serve_releases(BROKEN_SCRIPT).await;
        let home = tempfile::tempdir().unwrap();
        let prefix = home.path().join("engine");
        previous_installation(&prefix);

        let error = install_releases(&fast_downloader(), &served.releases, &prefix, |_| {})
            .await
            .expect_err("must fail");

        assert!(error.contains("Colima does not run on this Mac"), "{error}");
        assert!(error.contains("bad CPU type"), "{error}");
        assert_eq!(fs::read(prefix.join("bin/colima")).unwrap(), b"previous");
        assert_eq!(entries(home.path()), ["engine"]);
    }

    #[tokio::test]
    async fn replaces_a_previous_installation_as_a_whole() {
        let served = serve_releases(COLIMA_SCRIPT).await;
        let home = tempfile::tempdir().unwrap();
        let prefix = home.path().join("engine");
        previous_installation(&prefix);
        fs::write(prefix.join("bin/stale"), b"stale").unwrap();

        install_releases(&fast_downloader(), &served.releases, &prefix, |_| {})
            .await
            .unwrap();

        assert_eq!(fs::read(prefix.join("bin/colima")).unwrap(), COLIMA_SCRIPT);
        assert!(!prefix.join("bin/stale").exists());
        assert_eq!(entries(home.path()), ["engine"]);
    }

    #[tokio::test]
    async fn retries_a_download_the_server_failed_to_send() {
        let served = serve_releases(COLIMA_SCRIPT).await;
        served.server.fail_first_requests("/colima", 2);
        let home = tempfile::tempdir().unwrap();

        install_releases(
            &fast_downloader(),
            &served.releases[..1],
            &home.path().join("engine"),
            |_| {},
        )
        .await
        .unwrap();

        assert_eq!(served.server.requests(), ["/colima"; 3]);
    }

    #[tokio::test]
    async fn gives_up_after_three_failed_attempts() {
        let served = serve_releases(COLIMA_SCRIPT).await;
        served.server.fail_first_requests("/colima", 3);
        let home = tempfile::tempdir().unwrap();

        let error = install_releases(
            &fast_downloader(),
            &served.releases[..1],
            &home.path().join("engine"),
            |_| {},
        )
        .await
        .expect_err("must fail");

        assert!(error.contains("after 3 attempts"), "{error}");
        assert!(error.contains("503"), "{error}");
        assert!(entries(home.path()).is_empty());
    }

    #[tokio::test]
    async fn does_not_retry_a_download_that_does_not_exist() {
        let mut served = serve_releases(COLIMA_SCRIPT).await;
        served.releases[0].url = Cow::Owned(served.releases[0].url.replace("/colima", "/gone"));
        let home = tempfile::tempdir().unwrap();

        let error = install_releases(
            &fast_downloader(),
            &served.releases[..1],
            &home.path().join("engine"),
            |_| {},
        )
        .await
        .expect_err("must fail");

        assert!(error.contains("404"), "{error}");
        assert_eq!(served.server.requests(), ["/gone"]);
    }

    #[tokio::test]
    async fn removes_downloads_left_behind_by_an_interrupted_installation() {
        let served = serve_releases(COLIMA_SCRIPT).await;
        let home = tempfile::tempdir().unwrap();
        let leftover = home.path().join(format!("{WORKSPACE_PREFIX}interrupted"));
        fs::create_dir_all(leftover.join("staging/bin")).unwrap();
        fs::write(home.path().join("config.json"), b"{}").unwrap();

        install_releases(
            &fast_downloader(),
            &served.releases,
            &home.path().join("engine"),
            |_| {},
        )
        .await
        .unwrap();

        assert_eq!(entries(home.path()), ["config.json", "engine"]);
    }

    #[test]
    fn needs_room_for_the_downloads_and_the_unpacked_files_at_once() {
        let releases = pinned_releases(ColimaArchitecture::Aarch64);
        let required = required_disk_bytes(&releases);

        assert_eq!(
            required,
            releases
                .iter()
                .map(|release| release.download_bytes + release.unpacked_bytes)
                .sum::<u64>()
        );
        assert!(ensure_enough_space(required, required, Path::new("/home")).is_ok());

        let error =
            ensure_enough_space(required - 1, required, Path::new("/home")).expect_err("must fail");
        assert!(error.contains("needs 195 MB"), "{error}");
        assert!(error.contains("194 MB are free"), "{error}");
    }

    #[tokio::test]
    #[ignore = "downloads about 65 MB from GitHub and download.docker.com"]
    async fn installs_the_pinned_releases_for_this_mac() {
        let architecture = match std::env::consts::ARCH {
            "aarch64" => ColimaArchitecture::Aarch64,
            _ => ColimaArchitecture::X86_64,
        };
        let releases = pinned_releases(architecture);
        let home = tempfile::tempdir().unwrap();
        let prefix = home.path().join("engine");

        install_releases(&Downloader::new().unwrap(), &releases, &prefix, |_| {})
            .await
            .unwrap();

        let run = |program: &str, arg: &str| {
            let output = std::process::Command::new(prefix.join("bin").join(program))
                .arg(arg)
                .env(
                    "PATH",
                    format!("{}:{}", prefix.join("bin").display(), SYSTEM_PATH),
                )
                .output()
                .unwrap();
            assert!(output.status.success(), "{program} {arg} failed");
            String::from_utf8_lossy(&output.stdout).to_string()
        };
        assert!(run("colima", "version").contains("colima version v0.10.3"));
        assert!(run("limactl", "--version").contains("limactl version 2.2.1"));
        assert!(run("docker", "--version").contains("Docker version 29.10.0"));
        assert!(prefix.join("share/lima/templates/default.yaml").exists());
        assert_eq!(entries(home.path()), ["engine"]);
    }
}
