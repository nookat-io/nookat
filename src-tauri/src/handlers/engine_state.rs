use crate::entities::EngineState;
use crate::handlers::system::engine_state_monitor;
use crate::state::SharedEngineState;
use tauri::State;
use tracing::{debug, instrument};

/// Get the complete engine state including all Docker entities.
///
/// The state is read and published by the engine state monitor, so the
/// snapshot carries the next version in the same sequence as the
/// `engine_state_update` pushes, and the frontend can tell which one is newer.
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_engine_state(
    app: tauri::AppHandle,
    state: State<'_, SharedEngineState>,
) -> Result<EngineState, String> {
    debug!("Getting complete engine state");

    let engine_state = engine_state_monitor(&app, state.inner())
        .await
        .refresh()
        .await
        .map_err(|e| e.to_string())?;

    debug!(
        "Engine state {} published with {} containers, {} images, {} volumes, {} networks",
        engine_state.version,
        engine_state.containers.len(),
        engine_state.images.len(),
        engine_state.volumes.len(),
        engine_state.networks.len()
    );

    Ok(engine_state)
}
