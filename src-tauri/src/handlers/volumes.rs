use crate::entities::Volume;
use crate::services::VolumesService;
use crate::state::SharedEngineState;
use tauri::State;
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn list_volumes(state: State<'_, SharedEngineState>) -> Result<Vec<Volume>, String> {
    debug!("Listing volumes");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    VolumesService::get_volumes(docker).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn remove_volume(
    state: State<'_, SharedEngineState>,
    name: String,
) -> Result<(), String> {
    debug!("Removing volume");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    VolumesService::remove_volume(docker, &name).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_remove_volumes(
    state: State<'_, SharedEngineState>,
    names: Vec<String>,
) -> Result<(), String> {
    debug!("Removing {} volumes", names.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    VolumesService::bulk_remove_volumes(docker, &names).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn inspect_volume(
    state: State<'_, SharedEngineState>,
    name: String,
) -> Result<Volume, String> {
    debug!("Inspecting volume");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    VolumesService::inspect_volume(docker, &name).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn prune_volumes(state: State<'_, SharedEngineState>) -> Result<String, String> {
    debug!("Pruning unused volumes");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;

    // Get initial count of volumes
    let initial_volumes = VolumesService::get_volumes(docker).await?;
    let initial_count = initial_volumes.len();

    // Perform the pruning
    VolumesService::prune_volumes(docker).await?;

    // Get final count of volumes
    let final_volumes = VolumesService::get_volumes(docker).await?;
    let final_count = final_volumes.len();

    let pruned_count = initial_count - final_count;

    Ok(format!("Pruned {} unused volumes", pruned_count))
}
