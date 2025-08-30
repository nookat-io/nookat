use crate::entities::{Image, PruneResult};
use crate::services::{BuildOptions, ImagesService};
use crate::state::SharedEngineState;
use std::collections::HashMap;
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
    registry: String,
) -> Result<(), String> {
    debug!("Pulling image: {} from registry: {}", image_name, registry);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::pull_image(docker, &image_name, &registry).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn build_image(
    state: State<'_, SharedEngineState>,
    dockerfile_path: String,
    build_context: String,
    image_name: String,
    build_args: HashMap<String, String>,
    options: BuildOptions,
) -> Result<(), String> {
    debug!(
        "Building image: {} from Dockerfile: {}",
        image_name, dockerfile_path
    );

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::build_image(
        docker,
        &dockerfile_path,
        &build_context,
        &image_name,
        build_args,
        options,
    )
    .await
}
