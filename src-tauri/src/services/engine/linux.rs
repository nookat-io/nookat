use crate::entities::{ColimaConfig, InstallationMethod};
use tauri::AppHandle;
use tracing::{debug, instrument, warn};
use bollard::Docker;
use std::process::Command;

#[instrument(skip_all, err)]
pub async fn is_homebrew_available() -> Result<bool, String> {
    // Homebrew is only available on macOS
    Ok(false)
}

#[instrument(skip_all, err)]
pub async fn install_colima(
    _app_handle: AppHandle,
    _method: InstallationMethod,
) -> Result<(), String> {
    // Colima is only implemented on macOS for now, other platforms are not supported yet
    todo!("Colima is only implemented on macOS for now, other platforms are not supported yet");
}

#[instrument(skip_all, err)]
pub async fn start_colima_vm(_app_handle: AppHandle, _config: ColimaConfig) -> Result<(), String> {
    todo!("Colima is only implemented on macOS for now, other platforms are not supported yet");
}

#[instrument(skip_all, err)]
pub async fn is_colima_available() -> Result<bool, String> {
    // Colima is only implemented on macOS for now, other platforms are not supported yet
    Ok(false)
}

#[instrument(skip_all, err)]
pub async fn connect_to_docker_using_different_contexts() -> Result<Docker, String> {
    debug!("Trying to connect to Docker via different contexts");

    let context_output = Command::new("docker")
        .arg("context")
        .arg("ls")
        .arg("--format")
        .arg("{{.DockerEndpoint}}")
        .output();

    if let Ok(output) = context_output {
        if output.status.success() {
            let output_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let socket_paths = output_str.lines();

            for socket_path in socket_paths {
                if socket_path.starts_with("unix://") {
                    let socket_path = socket_path.trim_start_matches("unix://");
                    debug!("Current Docker context socket: {}", socket_path);

                    if let Ok(docker) = Docker::connect_with_unix(
                        socket_path,
                        5,
                        bollard::API_DEFAULT_VERSION,
                    ) {
                        if docker.ping().await.is_ok() {
                            debug!("Successfully connected to Docker via context socket");
                            return Ok(docker);
                        }
                    }
                } else {
                    warn!(
                        "Current Docker context socket is not a Unix socket: {}",
                        socket_path
                    );
                }
            }
        }
    }

    Err("Failed to connect to Docker via context socket".to_string())
}
