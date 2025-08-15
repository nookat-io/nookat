use crate::entities::EngineStatus;
use crate::state::SharedEngineState;
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
