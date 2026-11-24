use super::{InstallEvent, ReleaseArtifact};
use crate::entities::InstallationProgress;
use std::path::Path;

const DOWNLOAD_START_PERCENT: u64 = 5;
const DOWNLOAD_END_PERCENT: u64 = 80;
const UNPACK_PERCENT: u8 = 85;
const CHECK_START_PERCENT: u64 = 88;
const CHECK_END_PERCENT: u64 = 98;
const BYTES_PER_MB: f64 = 1_000_000.0;

pub struct InstallProgress {
    progress: InstallationProgress,
    release_count: usize,
    total_download_bytes: u64,
    finished_download_bytes: u64,
    checked: usize,
    prefix: String,
}

impl InstallProgress {
    pub fn new(releases: &[ReleaseArtifact], prefix: &Path) -> Self {
        let prefix = prefix.display().to_string();
        let components = releases
            .iter()
            .map(|release| format!("{} {}", release.name, release.version))
            .collect::<Vec<_>>()
            .join(", ");

        InstallProgress {
            progress: InstallationProgress {
                step: "Preparing installation...".to_string(),
                message: format!("Installing {} into {}", components, prefix),
                percentage: Some(0),
                logs: vec![format!("[INFO] Installing {} into {}", components, prefix)],
            },
            release_count: releases.len(),
            total_download_bytes: releases.iter().map(|release| release.download_bytes).sum(),
            finished_download_bytes: 0,
            checked: 0,
            prefix,
        }
    }

    pub fn current(&self) -> &InstallationProgress {
        &self.progress
    }

    pub fn record(&mut self, event: &InstallEvent) -> bool {
        let before = self.progress.clone();

        match event {
            InstallEvent::Downloading {
                artifact, received, ..
            } => self.downloading(artifact, *received),
            InstallEvent::Verified { artifact } => {
                self.finished_download_bytes += artifact.download_bytes;
                self.progress.logs.push(format!(
                    "[INFO] Verified the SHA-256 digest of {} {}",
                    artifact.name, artifact.version
                ));
            }
            InstallEvent::Unpacking => {
                self.progress.step = "Unpacking...".to_string();
                self.progress.message = format!("Unpacking into {}", self.prefix);
                self.progress.percentage = Some(UNPACK_PERCENT);
                self.progress.logs.push("[INFO] Unpacking".to_string());
            }
            InstallEvent::Checked {
                artifact,
                version_output,
            } => {
                self.checked += 1;
                self.progress.step = "Checking the binaries...".to_string();
                self.progress.message = format!("{} runs on this Mac", artifact.name);
                self.progress.percentage = Some(share_of(
                    CHECK_START_PERCENT,
                    CHECK_END_PERCENT,
                    self.checked as u64,
                    self.release_count as u64,
                ));
                self.progress.logs.push(format!(
                    "[INFO] {}",
                    version_output.lines().next().unwrap_or_default()
                ));
            }
            InstallEvent::Activated => {
                self.progress.step = "Installation complete".to_string();
                self.progress.message = format!("Installed into {}", self.prefix);
                self.progress.percentage = Some(100);
                self.progress
                    .logs
                    .push(format!("[INFO] Installed into {}", self.prefix));
            }
        }

        self.progress.step != before.step
            || self.progress.percentage != before.percentage
            || self.progress.logs.len() != before.logs.len()
    }

    pub fn record_failure(&mut self, error: &str) {
        self.progress.step = "Installation failed".to_string();
        self.progress.message = error.to_string();
        self.progress.percentage = Some(100);
        self.progress.logs.push(format!("[ERROR] {}", error));
    }

    fn downloading(&mut self, artifact: &ReleaseArtifact, received: u64) {
        let step = format!("Downloading {} {}...", artifact.name, artifact.version);
        if self.progress.step != step {
            self.progress
                .logs
                .push(format!("[INFO] Downloading {}", artifact.url));
            self.progress.step = step;
        }

        let received = received.min(artifact.download_bytes);
        self.progress.message = format!(
            "{:.1} of {:.1} MB",
            received as f64 / BYTES_PER_MB,
            artifact.download_bytes as f64 / BYTES_PER_MB
        );
        self.progress.percentage = Some(share_of(
            DOWNLOAD_START_PERCENT,
            DOWNLOAD_END_PERCENT,
            self.finished_download_bytes + received,
            self.total_download_bytes,
        ));
    }
}

fn share_of(start: u64, end: u64, done: u64, total: u64) -> u8 {
    let done = done.min(total);
    let percent = start + (end - start) * done / total.max(1);
    u8::try_from(percent).unwrap_or(100)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::ColimaArchitecture;
    use crate::services::binary_install::pinned_releases;

    fn progress() -> (Vec<ReleaseArtifact>, InstallProgress) {
        let releases = pinned_releases(ColimaArchitecture::Aarch64);
        let progress = InstallProgress::new(&releases, Path::new("/Users/me/.nookat/engine"));
        (releases, progress)
    }

    #[test]
    fn starts_by_naming_every_component_and_where_it_goes() {
        let (_, progress) = progress();

        assert_eq!(
            progress.current().logs,
            ["[INFO] Installing Colima 0.10.3, Lima 2.2.1, Docker CLI 29.10.0 into /Users/me/.nookat/engine"]
        );
        assert_eq!(progress.current().percentage, Some(0));
    }

    #[test]
    fn download_progress_covers_all_downloads_by_size() {
        let (releases, mut progress) = progress();

        progress.record(&InstallEvent::Downloading {
            artifact: &releases[0],
            received: 0,
            total: releases[0].download_bytes,
        });
        assert_eq!(progress.current().percentage, Some(5));
        assert_eq!(progress.current().step, "Downloading Colima 0.10.3...");
        assert_eq!(progress.current().message, "0.0 of 15.7 MB");

        progress.record(&InstallEvent::Verified {
            artifact: &releases[0],
        });
        progress.record(&InstallEvent::Verified {
            artifact: &releases[1],
        });
        progress.record(&InstallEvent::Downloading {
            artifact: &releases[2],
            received: releases[2].download_bytes,
            total: releases[2].download_bytes,
        });

        assert_eq!(progress.current().percentage, Some(80));
        assert_eq!(progress.current().message, "10.3 of 10.3 MB");
    }

    #[test]
    fn asks_to_be_sent_only_when_the_step_or_the_whole_percentage_changes() {
        let (releases, mut progress) = progress();
        let downloading = |received| InstallEvent::Downloading {
            artifact: &releases[1],
            received,
            total: releases[1].download_bytes,
        };

        assert!(progress.record(&downloading(0)));
        assert!(!progress.record(&downloading(1_000)));
        assert!(progress.record(&downloading(releases[1].download_bytes)));
    }

    #[test]
    fn logs_each_download_source_once_and_each_verified_digest() {
        let (releases, mut progress) = progress();

        for received in [0, 1, 2] {
            progress.record(&InstallEvent::Downloading {
                artifact: &releases[0],
                received,
                total: releases[0].download_bytes,
            });
        }
        progress.record(&InstallEvent::Verified {
            artifact: &releases[0],
        });

        assert_eq!(
            progress.current().logs[1..],
            [
                "[INFO] Downloading https://github.com/abiosoft/colima/releases/download/v0.10.3/colima-Darwin-arm64",
                "[INFO] Verified the SHA-256 digest of Colima 0.10.3",
            ]
        );
    }

    #[test]
    fn finishes_after_unpacking_and_checking_every_binary() {
        let (releases, mut progress) = progress();

        progress.record(&InstallEvent::Unpacking);
        assert_eq!(progress.current().percentage, Some(85));

        progress.record(&InstallEvent::Checked {
            artifact: &releases[0],
            version_output: "colima version v0.10.3\ngit commit: 0a1b2c".to_string(),
        });
        assert_eq!(progress.current().percentage, Some(91));
        assert_eq!(
            progress.current().logs.last().unwrap(),
            "[INFO] colima version v0.10.3"
        );

        progress.record(&InstallEvent::Activated);
        assert_eq!(progress.current().percentage, Some(100));
        assert_eq!(
            progress.current().logs.last().unwrap(),
            "[INFO] Installed into /Users/me/.nookat/engine"
        );
    }

    #[test]
    fn a_failure_is_shown_as_the_message_and_logged() {
        let (_, mut progress) = progress();

        progress.record_failure("Lima 2.2.1 does not match its pinned SHA-256 digest");

        assert_eq!(progress.current().step, "Installation failed");
        assert_eq!(
            progress.current().message,
            "Lima 2.2.1 does not match its pinned SHA-256 digest"
        );
        assert_eq!(
            progress.current().logs.last().unwrap(),
            "[ERROR] Lima 2.2.1 does not match its pinned SHA-256 digest"
        );
    }
}
