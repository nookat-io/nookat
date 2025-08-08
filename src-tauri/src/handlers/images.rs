use crate::entities::{Image, PruneResult};
use crate::services::ImagesService;
use crate::state::SharedDockerState;
use tauri::State;
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn list_images(state: State<'_, SharedDockerState>) -> Result<Vec<Image>, String> {
    debug!("Listing images");
    let docker = state.get_docker().await?;
    let result = ImagesService::get_images(&docker).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn prune_images(state: State<'_, SharedDockerState>) -> Result<PruneResult, String> {
    debug!("Pruning unused images");

    let docker = state.get_docker().await?;
    let result = ImagesService::perform_prune(&docker).await;
    state.return_docker(docker).await;
    result
}
