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
    let result = ImagesService::get_images(&docker).await;
    state.return_engine(engine).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn prune_images(state: State<'_, SharedEngineState>) -> Result<PruneResult, String> {
    debug!("Pruning unused images");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let result = ImagesService::perform_prune(&docker).await;
    state.return_engine(engine).await;
    result
}
