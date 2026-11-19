use crate::entities::{BinaryInstallPlan, ColimaVm, ColimaVmSettingsChanges, InstallationMethod};
use crate::entities::{ConnectedEngine, EngineStatus};
use crate::services::engine::{
    binary_install_plan, describe_connected_engine, install_colima, managed_colima_endpoint,
    read_colima_vm, start_colima_vm, stop_colima_vm, use_colima_docker_context, COLIMA_MANAGED,
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
pub async fn get_connected_engine(
    state: State<'_, SharedEngineState>,
) -> Result<Option<ConnectedEngine>, String> {
    debug!("Describing the connected engine");

    let engine = state.get_engine().await?;
    let (Some(docker), Some(endpoint)) = (engine.docker.as_ref(), engine.endpoint.as_deref())
    else {
        return Ok(None);
    };
    let info = docker
        .info()
        .await
        .map_err(|e| format!("Failed to get Docker info: {}", e))?;
    Ok(Some(describe_connected_engine(
        endpoint,
        info.operating_system.as_deref(),
        info.name.as_deref(),
        managed_colima_endpoint().as_deref(),
    )))
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
pub async fn get_binary_install_plan(app: tauri::AppHandle) -> Result<BinaryInstallPlan, String> {
    debug!("Describing the binary installation");
    binary_install_plan(&app).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn use_colima_docker_context_command(
    app: tauri::AppHandle,
    state: State<'_, SharedEngineState>,
) -> Result<(), String> {
    info!("Switching the Docker CLI to the Colima context");
    let switched = use_colima_docker_context(&app).await;
    state.forget_connection().await;
    switched
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
    state: State<'_, SharedEngineState>,
    changes: ColimaVmSettingsChanges,
) -> Result<(), String> {
    info!("Starting Colima VM with changes: {:?}", changes);
    let started = start_colima_vm(&app, changes).await;
    state.forget_connection().await;
    started
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn stop_colima_vm_command(
    app: tauri::AppHandle,
    state: State<'_, SharedEngineState>,
) -> Result<(), String> {
    info!("Stopping Colima VM");
    let stopped = stop_colima_vm(&app).await;
    state.forget_connection().await;
    stopped
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
