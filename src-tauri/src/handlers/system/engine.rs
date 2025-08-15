use crate::entities::EngineStatus;
use crate::state::SharedEngineState;
use crate::services::engine::is_homebrew_available;
use tauri::State;
use tracing::{info, instrument};

/// Get the status of the container engine
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn engine_status(state: State<'_, SharedEngineState>) -> Result<EngineStatus, String> {
    info!("Getting engine status");

    let engine = state.get_engine().await?;
    let status = engine.engine_status.clone();
    info!("Engine status: {:?}", status);
    state.return_engine(engine).await;
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
