use crate::entities::{Image, PruneResult};
use crate::services::ImagesService;
use crate::state::SharedDockerState;
use tauri::State;

#[tauri::command]
pub async fn list_images(state: State<'_, SharedDockerState>) -> Result<Vec<Image>, String> {
    println!("Listing images");

    let docker = state.get_docker().await?;
    let result = ImagesService::get_images(&docker).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn prune_images(state: State<'_, SharedDockerState>) -> Result<PruneResult, String> {
    println!("Pruning unused images");

    let docker = state.get_docker().await?;
    let result = ImagesService::perform_prune(&docker).await;
    state.return_docker(docker).await;
    result
}
