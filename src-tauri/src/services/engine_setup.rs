use crate::entities::{ColimaStatus, DockerStatus, VmInfo};
use bollard::Docker;
use std::process::Command;
use tracing::instrument;

#[derive(Default, Debug)]
pub struct EngineSetupService {}

impl EngineSetupService {
    #[instrument(skip_all, err)]
    pub async fn detect_docker_runtime(docker: &Docker) -> Result<DockerStatus, String> {
        // Try to get Docker info to check if daemon is accessible
        match docker.info().await {
            Ok(_) => Ok(DockerStatus::Running),
            Err(_) => {
                // Check if Docker daemon socket exists but is not responding
                #[cfg(target_os = "macos")]
                {
                    if std::path::Path::new("/var/run/docker.sock").exists() {
                        return Ok(DockerStatus::Error);
                    }
                }
                #[cfg(target_os = "linux")]
                {
                    if std::path::Path::new("/var/run/docker.sock").exists() {
                        return Ok(DockerStatus::Error);
                    }
                }
                Ok(DockerStatus::Stopped)
            }
        }
    }



    #[cfg(not(target_os = "macos"))]
    #[instrument(skip_all, err)]
    pub async fn check_colima_status() -> Result<ColimaStatus, String> {
        todo!()
    }

    #[cfg(target_os = "macos")]
    #[instrument(skip_all, err)]
    pub async fn check_colima_status() -> Result<ColimaStatus, String> {
        // Check if colima is installed
        let colima_installed = Command::new("which")
            .arg("colima")
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false);

        if !colima_installed {
            return Ok(ColimaStatus {
                is_installed: false,
                is_running: false,
                vm_info: None,
            });
        }

        // Check colima status
        let status_output = Command::new("colima")
            .arg("status")
            .output()
            .map_err(|e| format!("Failed to execute colima status: {}", e))?;

        if !status_output.status.success() {
            return Ok(ColimaStatus {
                is_installed: true,
                is_running: false,
                vm_info: None,
            });
        }

        let status_text = String::from_utf8_lossy(&status_output.stdout);
        let is_running = status_text.contains("Running");

        // Parse VM info if running
        let vm_info = if is_running {
            Self::parse_colima_vm_info(&status_text)
        } else {
            None
        };

        Ok(ColimaStatus {
            is_installed: true,
            is_running,
            vm_info,
        })
    }

    fn parse_colima_vm_info(status_text: &str) -> Option<VmInfo> {
        // Parse CPU info
        let cpu = status_text
            .lines()
            .find(|line| line.contains("CPU:"))
            .and_then(|line| {
                line.split_whitespace()
                    .nth(1)
                    .and_then(|s| s.parse::<u32>().ok())
            })
            .unwrap_or(0);

        // Parse memory info (convert to bytes)
        let memory = status_text
            .lines()
            .find(|line| line.contains("Memory:"))
            .and_then(|line| {
                line.split_whitespace()
                    .nth(1)
                    .and_then(|s| {
                        if s.ends_with("GB") {
                            s.trim_end_matches("GB")
                                .parse::<u64>()
                                .map(|g| g * 1024 * 1024 * 1024)
                                .ok()
                        } else if s.ends_with("MB") {
                            s.trim_end_matches("MB")
                                .parse::<u64>()
                                .map(|m| m * 1024 * 1024)
                                .ok()
                        } else {
                            s.parse::<u64>().ok()
                        }
                    })
            })
            .unwrap_or(0);

        // Parse disk info (convert to bytes)
        let disk = status_text
            .lines()
            .find(|line| line.contains("Disk:"))
            .and_then(|line| {
                line.split_whitespace()
                    .nth(1)
                    .and_then(|s| {
                        if s.ends_with("GB") {
                            s.trim_end_matches("GB")
                                .parse::<u64>()
                                .map(|g| g * 1024 * 1024 * 1024)
                                .ok()
                        } else if s.ends_with("MB") {
                            s.trim_end_matches("MB")
                                .parse::<u64>()
                                .map(|m| m * 1024 * 1024)
                                .ok()
                        } else {
                            s.parse::<u64>().ok()
                        }
                    })
            })
            .unwrap_or(0);

        // Parse architecture
        let architecture = status_text
            .lines()
            .find(|line| line.contains("Arch:"))
            .and_then(|line| {
                line.split_whitespace()
                    .nth(1)
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| "unknown".to_string());

        Some(VmInfo {
            cpu,
            memory,
            disk,
            architecture,
        })
    }
}
