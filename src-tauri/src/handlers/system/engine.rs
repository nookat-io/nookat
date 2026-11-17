use crate::entities::EngineStatus;
use crate::entities::{ColimaVm, ColimaVmSettingsChanges, InstallationMethod};
use crate::services::engine::{
    install_colima, read_colima_vm, start_colima_vm, stop_colima_vm, COLIMA_MANAGED,
};
use crate::services::shell::{is_colima_available, is_homebrew_available};
use crate::state::SharedEngineState;
use tauri::State;
use tracing::{debug, info, instrument};

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
    install_colima(&app, method).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_colima_vm(app: tauri::AppHandle) -> Result<ColimaVm, String> {
    debug!("Reading the Colima VM profile");
    read_colima_vm(&app).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_colima_vm_command(
    app: tauri::AppHandle,
    changes: ColimaVmSettingsChanges,
) -> Result<(), String> {
    info!("Starting Colima VM with changes: {:?}", changes);
    start_colima_vm(&app, changes).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn stop_colima_vm_command(app: tauri::AppHandle) -> Result<(), String> {
    info!("Stopping Colima VM");
    stop_colima_vm(&app).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn check_colima_availability(app: tauri::AppHandle) -> Result<bool, String> {
    info!("Checking Colima availability");
    is_colima_available(&app).await
}

#[tauri::command]
#[instrument(skip_all)]
pub fn is_colima_supported() -> bool {
    debug!("Colima supported on this platform: {}", COLIMA_MANAGED);
    COLIMA_MANAGED
}
