use crate::entities::{ColimaConfig, InstallationMethod};
use tauri::AppHandle;
use tracing::instrument;

#[instrument(skip_all, err)]
pub async fn is_homebrew_available() -> Result<bool, String> {
    // Homebrew is only available on macOS
    Ok(false)
}

#[instrument(skip_all, err)]
pub async fn install_colima(
    _app_handle: AppHandle,
    _method: InstallationMethod,
) -> Result<(), String> {
    // Colima is only implemented on macOS for now, other platforms are not supported yet
    todo!("Colima is only implemented on macOS for now, other platforms are not supported yet");
}

#[instrument(skip_all, err)]
pub async fn start_colima_vm(_app_handle: AppHandle, _config: ColimaConfig) -> Result<(), String> {
    todo!("Colima is only implemented on macOS for now, other platforms are not supported yet");
}

#[instrument(skip_all, err)]
pub async fn is_colima_available() -> Result<bool, String> {
    // Colima is only implemented on macOS for now, other platforms are not supported yet
    Ok(false)
}
