use crate::entities::{Engine, EngineInfo, EngineStatus};
use bollard::Docker;
use std::env;
use std::process::Command;
use tracing::{debug, instrument};


#[instrument(skip_all, err)]
async fn connect_to_docker_with_local_defaults() -> Result<Docker, String> {
    tracing::info!("Trying to connect to Docker via local defaults");

    let docker = Docker::connect_with_local_defaults().map_err(|e| format!("Failed to connect to Docker: {}", e))?;

    if let Ok(_) = docker.info().await {
        tracing::info!("Successfully connected to Docker via local defaults");
        return Ok(docker);
    }
    tracing::warn!("local defaults connection failed, trying fallback");
    Err("Failed to connect to Docker via local defaults".to_string())
}

#[instrument(skip_all, err)]
async fn connect_to_docker_using_different_contexts() -> Result<Docker, String> {
    tracing::info!("Trying to connect to Docker via different contexts");

    let context_output = Command::new("docker")
        .arg("context")
        .arg("ls")
        .arg("--format")
        .arg("{{.DockerEndpoint}}")
        .output();

    if let Ok(output) = context_output {
        if output.status.success() {
            let output_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let socket_paths = output_str.split("\n");

            for socket_path in socket_paths {
                if socket_path.starts_with("unix://") {
                    let socket_path = socket_path.trim_start_matches("unix://");
                    tracing::info!("Current Docker context socket: {}", socket_path);

                    // Set DOCKER_HOST environment variable for this process
                    env::set_var("DOCKER_HOST", format!("unix://{}", socket_path));

                    if let Ok(docker) = Docker::connect_with_local_defaults() {
                        if let Ok(_) = docker.info().await {
                            tracing::info!("Successfully connected to Docker via context socket");
                            return Ok(docker);
                        }
                    }
                } else {
                    tracing::warn!("Current Docker context socket is not a Unix socket: {}", socket_path);
                }

            }
        }
    }

    Err("Failed to connect to Docker via context socket".to_string())
}

#[instrument(skip_all, err)]
pub async fn connect_to_docker_macos() -> Result<Docker, String> {
    // First, check if DOCKER_HOST environment variable is set
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
    tracing::info!("Trying default Docker connection method");
    Docker::connect_with_local_defaults().map_err(|e| format!("Failed to connect to Docker: {}", e))
}

#[instrument(skip_all, err)]
pub async fn is_docker_command_available() -> Result<bool, String> {
    fn is_docker_installed(output_str: &str) -> bool {
        output_str.to_lowercase().contains("client:")
            || output_str.to_lowercase().contains("version:")
            || output_str.to_lowercase().contains("api version:")
    }

    let output = Command::new("docker")
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to execute docker command: {}", e))?;

    if !output.status.success() {
        return Ok(false);
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    Ok(is_docker_installed(&output_str))
}

#[instrument(skip_all, err)]
pub async fn create_engine() -> Result<Engine, String> {

    if !is_docker_command_available().await? {
        return Ok(Engine {
            engine_status: EngineStatus::Unknown,
            docker: None,
        });
    }

    if let Ok(docker) = connect_to_docker_macos().await {
        return Ok(Engine {
            engine_status: EngineStatus::Running(EngineInfo::Docker),
            docker: Some(docker),
        });
    }

    // TODO: Check if Colima is installed

    todo!()
    // Ok(Engine {
    //     engine_status: EngineStatus::Unknown,
    //     docker: None,
    // })
}
