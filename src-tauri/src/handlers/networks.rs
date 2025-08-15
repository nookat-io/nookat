use crate::entities::Network;
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
    let result = NetworksService::get_networks(&docker).await;
    state.return_engine(engine).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn remove_network(
    state: State<'_, SharedEngineState>,
    name: String,
) -> Result<(), String> {
    debug!("Removing network: {}", name);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let result = NetworksService::remove_network(&docker, &name).await;
    state.return_engine(engine).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_remove_networks(
    state: State<'_, SharedEngineState>,
    names: Vec<String>,
) -> Result<(), String> {
    debug!("Removing networks: {:?}", names);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let result = NetworksService::bulk_remove_networks(&docker, &names).await;
    state.return_engine(engine).await;
    result
}
