use crate::entities::{Engine, EngineInfo, EngineStatus};
use bollard::Docker;
use std::env;
use std::process::Command;
use tracing::{debug, info, warn,instrument};


#[instrument(skip_all, err)]
async fn connect_to_docker_with_local_defaults() -> Result<Docker, String> {
    info!("Trying to connect to Docker via local defaults");

    let docker = Docker::connect_with_local_defaults().map_err(|e| format!("Failed to connect to Docker: {}", e))?;

    if let Ok(_) = docker.info().await {
        info!("Successfully connected to Docker via local defaults");
        return Ok(docker);
    }
    warn!("local defaults connection failed, trying fallback");
    Err("Failed to connect to Docker via local defaults".to_string())
}

#[instrument(skip_all, err)]
async fn connect_to_docker_using_different_contexts() -> Result<Docker, String> {
    info!("Trying to connect to Docker via different contexts");

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
                    info!("Current Docker context socket: {}", socket_path);

                    // Set DOCKER_HOST environment variable for this process
                    env::set_var("DOCKER_HOST", format!("unix://{}", socket_path));

                    if let Ok(docker) = Docker::connect_with_local_defaults() {
                        if let Ok(_) = docker.info().await {
                            info!("Successfully connected to Docker via context socket");
                            return Ok(docker);
                        }
                    }
                } else {
                    warn!("Current Docker context socket is not a Unix socket: {}", socket_path);
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
    info!("Trying default Docker connection method");
    Docker::connect_with_local_defaults().map_err(|e| format!("Failed to connect to Docker: {}", e))
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
        debug!("Docker command is not available, output: {}", String::from_utf8_lossy(&output.stderr));
        return Ok(false);
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    debug!("Docker command is available, output: {}", output_str);
    let result = is_docker_installed(&output_str);
    debug!("Docker command is available, result: {}", result);
    Ok(result)
}

#[instrument(skip_all, err)]
pub async fn is_homebrew_available() -> Result<bool, String> {
    // Check if 'brew' command exists in PATH
    let output = Command::new("which")
        .arg("brew")
        .output()
        .map_err(|e| format!("Failed to check Homebrew availability: {}", e))?;

    if output.status.success() {
        // Additional check: try to run 'brew --version' to ensure it's working
        let version_output = Command::new("brew")
            .arg("--version")
            .output()
            .map_err(|e| format!("Failed to check Homebrew version: {}", e))?;

        Ok(version_output.status.success())
    } else {
        Ok(false)
    }
}

// #[instrument(skip_all, err)]
// pub async fn is_colima_installed() -> Result<(), String> {
//     debug!("Checking if Colima is installed");
//     todo!()
// }

// #[instrument(skip_all, err)]
// pub async fn check_colima_status() -> Result<ColimaStatus, String> {
//     // Check if colima is installed
//     let colima_installed = Command::new("which")
//         .arg("colima")
//         .output()
//         .map(|output| output.status.success())
//         .unwrap_or(false);

//     if !colima_installed {
//         return Ok(ColimaStatus {
//             is_installed: false,
//             is_running: false,
//             vm_info: None,
//         });
//     }

//     // Check colima status
//     let status_output = Command::new("colima")
//         .arg("status")
//         .output()
//         .map_err(|e| format!("Failed to execute colima status: {}", e))?;

//     if !status_output.status.success() {
//         return Ok(ColimaStatus {
//             is_installed: true,
//             is_running: false,
//             vm_info: None,
//         });
//     }

//     let status_text = String::from_utf8_lossy(&status_output.stdout);
//     let is_running = status_text.contains("Running");

//     // Parse VM info if running
//     let vm_info = if is_running {
//         Self::parse_colima_vm_info(&status_text)
//     } else {
//         None
//     };

//     Ok(ColimaStatus {
//         is_installed: true,
//         is_running,
//         vm_info,
//     })
// }


#[instrument(skip_all, err)]
pub async fn create_engine() -> Result<Engine, String> {
    info!("Creating an engine instance");

    if !is_docker_command_available().await? {
        info!("Docker command is not available, creating an engine instance with unknown status");
        return Ok(Engine {
            engine_status: EngineStatus::Unknown,
            docker: None,
        });
    }

    if let Ok(docker) = connect_to_docker_macos().await {
        info!("Docker command is available, creating an engine instance with running status");
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
