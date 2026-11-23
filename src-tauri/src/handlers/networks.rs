use crate::entities::{BulkOutcome, Network, NetworkCreateOptions};
use crate::services::NetworksService;
use crate::state::SharedEngineState;
use tauri::State;
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn list_networks(state: State<'_, SharedEngineState>) -> Result<Vec<Network>, String> {
    debug!("Listing networks");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    NetworksService::get_networks(docker).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn create_network(
    state: State<'_, SharedEngineState>,
    options: NetworkCreateOptions,
) -> Result<(), String> {
    debug!("Creating network");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    NetworksService::create_network(docker, &options).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn remove_network(
    state: State<'_, SharedEngineState>,
    name: String,
) -> Result<(), String> {
    debug!("Removing network");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    NetworksService::remove_network(docker, &name).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_remove_networks(
    state: State<'_, SharedEngineState>,
    names: Vec<String>,
) -> Result<BulkOutcome, String> {
    debug!("Removing {} networks", names.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    Ok(NetworksService::bulk_remove_networks(docker, &names).await)
}
