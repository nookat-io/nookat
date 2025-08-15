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
    let result = VolumesService::get_volumes(&docker).await;
    state.return_engine(engine).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn remove_volume(
    state: State<'_, SharedEngineState>,
    name: String,
) -> Result<(), String> {
    debug!("Removing volume: {}", name);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let result = VolumesService::remove_volume(&docker, &name).await;
    state.return_engine(engine).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_remove_volumes(
    state: State<'_, SharedEngineState>,
    names: Vec<String>,
) -> Result<(), String> {
    debug!("Removing volumes: {:?}", names);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let result = VolumesService::bulk_remove_volumes(&docker, &names).await;
    state.return_engine(engine).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn inspect_volume(
    state: State<'_, SharedEngineState>,
    name: String,
) -> Result<Volume, String> {
    debug!("Inspecting volume: {}", name);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let result = VolumesService::inspect_volume(&docker, &name).await;
    state.return_engine(engine).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn prune_volumes(state: State<'_, SharedEngineState>) -> Result<(), String> {
    debug!("Pruning unused volumes");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let result = VolumesService::prune_volumes(&docker).await;
    state.return_engine(engine).await;
    result
}
