use crate::entities::Volume;
use crate::services::VolumesService;
use crate::state::SharedDockerState;
use tauri::State;
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn list_volumes(state: State<'_, SharedDockerState>) -> Result<Vec<Volume>, String> {
    debug!("Listing volumes");

    let docker = state.get_docker().await?;
    let result = VolumesService::get_volumes(&docker).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn remove_volume(
    state: State<'_, SharedDockerState>,
    name: String,
) -> Result<(), String> {
    debug!("Removing volume: {}", name);

    let docker = state.get_docker().await?;
    let result = VolumesService::remove_volume(&docker, &name).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_remove_volumes(
    state: State<'_, SharedDockerState>,
    names: Vec<String>,
) -> Result<(), String> {
    debug!("Removing volumes: {:?}", names);

    let docker = state.get_docker().await?;
    let result = VolumesService::bulk_remove_volumes(&docker, &names).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn inspect_volume(
    state: State<'_, SharedDockerState>,
    name: String,
) -> Result<Volume, String> {
    debug!("Inspecting volume: {}", name);

    let docker = state.get_docker().await?;
    let result = VolumesService::inspect_volume(&docker, &name).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn prune_volumes(state: State<'_, SharedDockerState>) -> Result<(), String> {
    debug!("Pruning unused volumes");

    let docker = state.get_docker().await?;
    let result = VolumesService::prune_volumes(&docker).await;
    state.return_docker(docker).await;
    result
}
