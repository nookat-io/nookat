use crate::entities::{ColimaVm, ColimaVmSettingsChanges, InstallationMethod};
use crate::services::engine::colima_unmanaged;
use tauri::AppHandle;
use tracing::instrument;

#[instrument(skip_all, err)]
pub async fn install_colima(_app: &AppHandle, _method: InstallationMethod) -> Result<(), String> {
    colima_unmanaged()
}

#[instrument(skip_all, err)]
pub async fn read_colima_vm(_app: &AppHandle) -> Result<ColimaVm, String> {
    colima_unmanaged()
}

#[instrument(skip_all, err)]
pub async fn start_colima_vm(
    _app: &AppHandle,
    _changes: ColimaVmSettingsChanges,
) -> Result<(), String> {
    colima_unmanaged()
}

#[instrument(skip_all, err)]
pub async fn stop_colima_vm(_app: &AppHandle) -> Result<(), String> {
    colima_unmanaged()
}
