use super::{ArtifactLayout, ReleaseArtifact};
use flate2::read::GzDecoder;
use std::fs::{self, File};
use std::os::unix::fs::PermissionsExt;
use std::path::{Component, Path, PathBuf};

const EXECUTABLE_MODE: u32 = 0o755;

pub fn bin_dir(prefix: &Path) -> PathBuf {
    prefix.join("bin")
}

pub fn place_artifact(
    download: &Path,
    artifact: &ReleaseArtifact,
    prefix: &Path,
) -> Result<(), String> {
    let bin = bin_dir(prefix);
    fs::create_dir_all(&bin).map_err(|e| format!("Failed to create {:?}: {}", bin, e))?;

    match &artifact.layout {
        ArtifactLayout::Executable { install_as } => {
            let target = bin.join(install_as);
            fs::copy(download, &target)
                .map_err(|e| format!("Failed to install {}: {}", artifact.name, e))?;
            make_executable(&target)
        }
        ArtifactLayout::PrefixArchive => open_tar_gz(download)?
            .unpack(prefix)
            .map_err(|e| format!("Failed to unpack {}: {}", artifact.name, e)),
        ArtifactLayout::ArchivedExecutable {
            path_in_archive,
            install_as,
        } => {
            let target = bin.join(install_as);
            extract_file(download, Path::new(path_in_archive), &target)
                .map_err(|e| format!("Failed to unpack {}: {}", artifact.name, e))?;
            make_executable(&target)
        }
    }
}

fn open_tar_gz(path: &Path) -> Result<tar::Archive<GzDecoder<File>>, String> {
    let file = File::open(path).map_err(|e| format!("Failed to open {:?}: {}", path, e))?;
    Ok(tar::Archive::new(GzDecoder::new(file)))
}

fn extract_file(archive_path: &Path, wanted: &Path, target: &Path) -> Result<(), String> {
    let mut archive = open_tar_gz(archive_path)?;
    let entries = archive.entries().map_err(|e| e.to_string())?;

    for entry in entries {
        let mut entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path().map_err(|e| e.to_string())?;
        if without_current_dir(&path) == wanted {
            entry.unpack(target).map_err(|e| e.to_string())?;
            return Ok(());
        }
    }

    Err(format!("{:?} is missing from the archive", wanted))
}

fn without_current_dir(path: &Path) -> PathBuf {
    path.components()
        .filter(|component| *component != Component::CurDir)
        .collect()
}

fn make_executable(path: &Path) -> Result<(), String> {
    fs::set_permissions(path, fs::Permissions::from_mode(EXECUTABLE_MODE))
        .map_err(|e| format!("Failed to make {:?} executable: {}", path, e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::binary_install::test_fixtures::{tar_gz, Fixture};
    use std::borrow::Cow;

    fn artifact(layout: ArtifactLayout) -> ReleaseArtifact {
        ReleaseArtifact {
            name: "Test",
            version: "1.0.0",
            url: Cow::Borrowed("https://example.invalid/test"),
            sha256: Cow::Borrowed(""),
            download_bytes: 0,
            unpacked_bytes: 0,
            layout,
            check_command: "test",
        }
    }

    fn mode(path: &Path) -> u32 {
        fs::metadata(path).unwrap().permissions().mode() & 0o777
    }

    #[test]
    fn installs_a_plain_binary_as_an_executable_in_bin() {
        let workspace = tempfile::tempdir().unwrap();
        let download = workspace.path().join("download");
        fs::write(&download, b"binary").unwrap();
        let prefix = workspace.path().join("prefix");

        place_artifact(
            &download,
            &artifact(ArtifactLayout::Executable {
                install_as: "colima",
            }),
            &prefix,
        )
        .unwrap();

        let installed = prefix.join("bin/colima");
        assert_eq!(fs::read(&installed).unwrap(), b"binary");
        assert_eq!(mode(&installed), EXECUTABLE_MODE);
    }

    #[test]
    fn keeps_the_whole_prefix_tree_of_an_archive_so_lima_finds_its_guest_agents() {
        let workspace = tempfile::tempdir().unwrap();
        let download = workspace.path().join("lima.tar.gz");
        tar_gz(
            &download,
            &[
                Fixture::executable("./bin/limactl", b"limactl"),
                Fixture::file("./share/lima/lima-guestagent.Linux-aarch64.gz", b"agent"),
                Fixture::symlink("./share/doc/lima/templates", "../../lima/templates"),
            ],
        );
        let prefix = workspace.path().join("prefix");

        place_artifact(&download, &artifact(ArtifactLayout::PrefixArchive), &prefix).unwrap();

        assert_eq!(mode(&prefix.join("bin/limactl")), EXECUTABLE_MODE);
        assert_eq!(
            fs::read(prefix.join("share/lima/lima-guestagent.Linux-aarch64.gz")).unwrap(),
            b"agent"
        );
        assert_eq!(
            fs::read_link(prefix.join("share/doc/lima/templates")).unwrap(),
            Path::new("../../lima/templates")
        );
    }

    #[test]
    fn takes_only_the_named_executable_out_of_an_archive() {
        let workspace = tempfile::tempdir().unwrap();
        let download = workspace.path().join("docker.tgz");
        tar_gz(
            &download,
            &[
                Fixture::file("docker/README", b"readme"),
                Fixture::file("docker/docker", b"docker"),
            ],
        );
        let prefix = workspace.path().join("prefix");

        place_artifact(
            &download,
            &artifact(ArtifactLayout::ArchivedExecutable {
                path_in_archive: "docker/docker",
                install_as: "docker",
            }),
            &prefix,
        )
        .unwrap();

        assert_eq!(fs::read(prefix.join("bin/docker")).unwrap(), b"docker");
        assert_eq!(mode(&prefix.join("bin/docker")), EXECUTABLE_MODE);
        assert!(!prefix.join("docker").exists());
    }

    #[test]
    fn reports_an_archive_without_the_named_executable() {
        let workspace = tempfile::tempdir().unwrap();
        let download = workspace.path().join("docker.tgz");
        tar_gz(&download, &[Fixture::file("docker/README", b"readme")]);

        let error = place_artifact(
            &download,
            &artifact(ArtifactLayout::ArchivedExecutable {
                path_in_archive: "docker/docker",
                install_as: "docker",
            }),
            &workspace.path().join("prefix"),
        )
        .expect_err("must fail");

        assert!(error.contains("docker/docker"), "{error}");
    }
}
