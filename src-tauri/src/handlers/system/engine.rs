use crate::entities::EngineStatus;
use crate::entities::{ColimaConfig, InstallationMethod};
use crate::services::engine::{
    install_colima, start_colima_vm,
};
use crate::services::shell::{is_colima_available, is_homebrew_available};
use crate::state::SharedEngineState;
use tauri::State;
use tracing::{debug, info, instrument};

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
pub async fn check_homebrew_availability(app: tauri::AppHandle) -> Result<bool, String> {
    is_homebrew_available(&app).await
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
pub async fn check_colima_availability(app: tauri::AppHandle) -> Result<bool, String> {
    info!("Checking Colima availability");
    is_colima_available(&app).await
}
