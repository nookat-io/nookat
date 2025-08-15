mod install;

use crate::entities::EngineStatus;


use tracing::{debug, info};


async fn check_docker_status() -> Result<EngineStatus, String> {
    debug!("Checking Docker status");
    let docker_version_output = std::process::Command::new("docker")
        .arg("version")
        .output();

    match docker_version_output {
        Ok(output) => {
            // Check if the output contains Client info, which indicates Docker is installed
            let output_str = String::from_utf8_lossy(&output.stdout);
            if is_docker_installed(&output_str) {
                debug!("Docker is installed");

                // If we're here that means docker is available. Check if Docker is running `docker version`

                // Docker is installed, now check if it's running via the state
                // let docker_result = state.get_docker().await;

                // if docker_result.is_err() {
                //     info!("docker is installed but not running");

                //     let colima_status = engine_service.check_colima_status().await;

                //     info!("docker_result: {:?}", docker_result);
                //     info!("colima_status: {:?}", colima_status);

                //     return Ok(EngineSetupStatus {
                //         docker_status: DockerStatus::Stopped,
                //         colima_status : colima_status.unwrap(),
                //     });
                // }

                return Ok(EngineStatus::Installed(EngineInfo::Docker));
            } else {
                info!("Docker is not installed");
                return Ok(EngineStatus::Unknown);
            }
        }
        Err(_) => {
            info!("Docker is not installed or not in PATH");
            return Ok(EngineStatus::Unknown)
        }
    };



}

pub async fn get_engine_status() -> Result<EngineStatus, String> {
    // First, check if Docker is installed
    let docker_status = check_docker_status().await?;

    // if docker is not installed or not running, check if colima is installed



    // Docker is installed and running
    // let docker = docker_result.unwrap();
    // let docker_status = engine_service.detect_docker_runtime(&docker).await?;
    // let colima_status = engine_service.check_colima_status().await?;

    // state.return_docker(docker).await;

    // Ok(EngineSetupStatus {
    //     docker_status,
    //     colima_status,
    // })
}
