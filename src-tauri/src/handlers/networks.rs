use crate::entities::Network;
use crate::services::networks::NetworksService;
use crate::state::SharedEngineState;
use tauri::State;
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn list_networks(state: State<'_, SharedEngineState>) -> Result<Vec<Network>, String> {
    debug!("Listing networks");

    let engine = state.get_engine().await?;
    let result = NetworksService::get_networks(&engine).await;
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
    let result = NetworksService::remove_network(&engine, &name).await;
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
    let result = NetworksService::bulk_remove_networks(&engine, &names).await;
    state.return_engine(engine).await;
    result
}
