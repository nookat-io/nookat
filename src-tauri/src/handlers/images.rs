use crate::entities::{Image, PruneResult};
use crate::services::ImagesService;
use crate::state::SharedEngineState;
use tauri::State;
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn list_images(state: State<'_, SharedEngineState>) -> Result<Vec<Image>, String> {
    debug!("Listing images");
    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::get_images(docker).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn prune_images(state: State<'_, SharedEngineState>) -> Result<PruneResult, String> {
    debug!("Pruning unused images");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::perform_prune(docker).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn delete_image(
    state: State<'_, SharedEngineState>,
    image_id: String,
) -> Result<(), String> {
    debug!("Deleting image: {}", image_id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::delete_image(docker, &image_id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn pull_image(
    state: State<'_, SharedEngineState>,
    image_name: String,
    tag: String,
    registry: String,
) -> Result<(), String> {
    debug!(
        "Pulling image: {}:{} from registry: {}",
        image_name, tag, registry
    );

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::pull_image(docker, &image_name, &tag, &registry).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn search_docker_hub(query: String) -> Result<serde_json::Value, String> {
    debug!("Searching Docker Hub for: {}", query);
    ImagesService::search_docker_hub(&query).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn fetch_image_tags(image_name: String) -> Result<Vec<String>, String> {
    debug!("Fetching tags for image: {}", image_name);
    ImagesService::fetch_image_tags(&image_name).await
}
