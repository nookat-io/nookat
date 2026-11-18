use crate::entities::{ColimaConfig, InstallationMethod};
use crate::services::engine::colima_unmanaged;
use tauri::AppHandle;
use tracing::instrument;

#[instrument(skip_all, err)]
pub async fn install_colima(_app: &AppHandle, _method: InstallationMethod) -> Result<(), String> {
    colima_unmanaged()
}

#[instrument(skip_all, err)]
pub async fn start_colima_vm(_app: &AppHandle, _config: ColimaConfig) -> Result<(), String> {
    colima_unmanaged()
}

#[instrument(skip_all, err)]
pub async fn stop_colima_vm(_app: &AppHandle) -> Result<(), String> {
    colima_unmanaged()
}
