use crate::entities::{Engine, EngineInfo, EngineStatus};

use bollard::Docker;
use std::env;
use std::process::Command;
use tracing::{debug, instrument, warn};

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(not(target_os = "macos"))]
mod stub;

#[cfg(not(target_os = "macos"))]
pub use stub::*;

#[instrument(skip_all, err)]
async fn connect_to_docker_using_different_contexts() -> Result<Docker, String> {
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

#[instrument(skip_all, err)]
async fn connect_to_docker_with_local_defaults() -> Result<Docker, String> {
    debug!("Trying to connect to Docker via local defaults");

    let docker = Docker::connect_with_local_defaults()
        .map_err(|e| format!("Failed to connect to Docker: {}", e))?;

    if docker.ping().await.is_ok() {
        debug!("Successfully connected to Docker via local defaults");
        return Ok(docker);
    }
    warn!("local defaults connection failed, trying fallback");
    Err("Failed to connect to Docker via local defaults".to_string())
}

#[instrument(skip_all, err)]
async fn connect_to_docker() -> Result<Docker, String> {
    // First, attempt connecting via local defaults (honors DOCKER_HOST if set)
    if let Ok(docker) = connect_to_docker_with_local_defaults().await {
        return Ok(docker);
    }
    debug!("local defaults connection failed, trying fallback");

    // Try to get the current Docker context
    if let Ok(docker) = connect_to_docker_using_different_contexts().await {
        return Ok(docker);
    }
    debug!("context connection failed, trying fallback");

    // Last resort: try the default connection method
    debug!("Trying default Docker connection method");
    match Docker::connect_with_local_defaults() {
        Ok(docker) => {
            if docker.ping().await.is_ok() {
                Ok(docker)
            } else {
                Err("Failed to connect to Docker: ping failed on default connection".to_string())
            }
        }
        Err(e) => Err(format!("Failed to connect to Docker: {}", e)),
    }
}

#[instrument(skip_all, err)]
pub async fn is_docker_command_available() -> Result<bool, String> {
    debug!("Checking if Docker command is available");
    fn is_docker_installed(output_str: &str) -> bool {
        output_str.to_lowercase().contains("version")
    }

    let output = Command::new("docker")
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to execute docker command: {}", e))?;

    if !output.status.success() {
        debug!(
            "Docker command is not available, output: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        return Ok(false);
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    debug!("Docker command is available, output: {}", output_str);
    let result = is_docker_installed(&output_str);
    debug!("Docker command is available, result: {}", result);
    Ok(result)
}

#[instrument(skip_all, err)]
pub async fn create_engine() -> Result<Engine, String> {
    debug!("Creating an engine instance");

    if !is_docker_command_available().await? {
        debug!("Docker command is not available, creating an engine instance with unknown status");
        return Ok(Engine {
            engine_status: EngineStatus::Unknown,
            docker: None,
        });
    }

    if let Ok(docker) = connect_to_docker().await {
        debug!("Docker command is available, creating an engine instance with running status");
        return Ok(Engine {
            engine_status: EngineStatus::Running(EngineInfo::Docker),
            docker: Some(docker),
        });
    }

    Ok(Engine {
        engine_status: EngineStatus::Unknown,
        docker: None,
    })
}
