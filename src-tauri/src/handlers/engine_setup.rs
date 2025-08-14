use crate::entities::{ColimaStatus, DockerStatus, EngineSetupStatus, VmConfig, HomebrewStatus, VersionInfo, DownloadResult};
use crate::services::EngineSetupService;
use crate::state::SharedDockerState;
use tauri::State;
use tracing::{info, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn detect_engine_status(state: State<'_, SharedDockerState>) -> Result<EngineSetupStatus, String> {
    // First, check if Docker is installed by running `docker version`
    let docker_version_output = std::process::Command::new("docker")
        .arg("version")
        .output();

    let docker_installed = match docker_version_output {
        Ok(output) => {
            // Check if the output contains Client info, which indicates Docker is installed
            let output_str = String::from_utf8_lossy(&output.stdout);
            output_str.contains("Client:") || output_str.contains("Version:") || output_str.contains("API version:")
        }
        Err(_) => false,
    };

    info!("docker_installed: {:?}", docker_installed);

    if !docker_installed {
        // Docker is not installed at all
        let colima_status = EngineSetupService::check_colima_status().await?;

        return Ok(EngineSetupStatus {
            docker_status: DockerStatus::NotInstalled,
            colima_status,
        });
    }

    // Docker is installed, now check if it's running via the state
    let docker_result = state.get_docker().await;

    if docker_result.is_err() {
        info!("docker is installed but not running");

        let colima_status = EngineSetupService::check_colima_status().await;

        info!("docker_result: {:?}", docker_result);
        info!("colima_status: {:?}", colima_status);

        return Ok(EngineSetupStatus {
            docker_status: DockerStatus::Stopped,
            colima_status : colima_status.unwrap(),
        });
    }

    // Docker is installed and running
    let docker = docker_result.unwrap();
    let docker_status = EngineSetupService::detect_docker_runtime(&docker).await?;
    let colima_status = EngineSetupService::check_colima_status().await?;

    state.return_docker(docker).await;

    Ok(EngineSetupStatus {
        docker_status,
        colima_status,
    })
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn check_colima_availability() -> Result<ColimaStatus, String> {
    EngineSetupService::check_colima_status().await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn check_homebrew_availability() -> Result<HomebrewStatus, String> {
    EngineSetupService::check_homebrew_availability().await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_colima_installation() -> Result<(), String> {
    EngineSetupService::start_colima_installation().await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_installation_logs() -> Result<Vec<String>, String> {
    EngineSetupService::get_installation_logs().await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_colima_vm(config: VmConfig) -> Result<(), String> {
    EngineSetupService::start_colima_vm(config).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_colima_vm_background(config: VmConfig) -> Result<(), String> {
    EngineSetupService::start_colima_vm_background(config).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_vm_startup_logs() -> Result<Vec<String>, String> {
    EngineSetupService::get_vm_startup_logs().await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_colima_versions() -> Result<VersionInfo, String> {
    EngineSetupService::get_colima_versions().await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn download_colima_binaries() -> Result<DownloadResult, String> {
    EngineSetupService::download_colima_binaries().await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn verify_binary_checksums() -> Result<bool, String> {
    EngineSetupService::verify_binary_checksums().await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn binary_install_colima() -> Result<(), String> {
    EngineSetupService::install_colima_binary().await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_binary_installation_logs() -> Result<Vec<String>, String> {
    EngineSetupService::get_binary_installation_logs().await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn clear_binary_installation_logs() -> Result<(), String> {
    EngineSetupService::clear_binary_installation_logs().await
}
