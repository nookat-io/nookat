use crate::entities::EngineStatus;
use crate::state::SharedEngineState;
use crate::services::engine::{is_homebrew_available, install_colima, start_colima_vm, is_colima_available};
use crate::entities::{InstallationMethod, ColimaConfig};
use tauri::State;
use tracing::{info, debug, instrument};

/// Get the status of the container engine
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn engine_status(state: State<'_, SharedEngineState>) -> Result<EngineStatus, String> {
    debug!("Getting engine status");

    let engine = state.get_engine().await?;
    let status = engine.engine_status.clone();
    debug!("Engine status: {:?}", status);
    Ok(status)
}


#[tauri::command]
#[instrument(skip_all, err)]
pub async fn check_homebrew_availability() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        let is_homebrew_available = is_homebrew_available().await?;
        Ok(is_homebrew_available)
    }

    #[cfg(not(target_os = "macos"))]
    {
        // Homebrew is only available on macOS
        Ok(false)
    }
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn install_colima_command(
    app: tauri::AppHandle,
    method: InstallationMethod,
) -> Result<(), String> {
    info!("Installing Colima via {:?}", method);
    install_colima(app, method).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_colima_vm_command(
    app: tauri::AppHandle,
    config: ColimaConfig,
) -> Result<(), String> {
    info!("Starting Colima VM with config: {:?}", config);
    start_colima_vm(app, config).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn check_colima_availability() -> Result<bool, String> {
    info!("Checking Colima availability");
    is_colima_available().await
}
