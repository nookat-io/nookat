use crate::entities::Network;
use crate::services::NetworksService;
use crate::state::SharedDockerState;
use tauri::State;
use tracing::{info, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn list_networks(state: State<'_, SharedDockerState>) -> Result<Vec<Network>, String> {
    info!("Listing networks");

    let docker = state.get_docker().await?;
    let result = NetworksService::get_networks(&docker).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn remove_network(
    state: State<'_, SharedDockerState>,
    name: String,
) -> Result<(), String> {
    info!("Removing network: {}", name);

    let docker = state.get_docker().await?;
    let result = NetworksService::remove_network(&docker, &name).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_remove_networks(
    state: State<'_, SharedDockerState>,
    names: Vec<String>,
) -> Result<(), String> {
    info!("Removing networks: {:?}", names);

    let docker = state.get_docker().await?;
    let result = NetworksService::bulk_remove_networks(&docker, &names).await;
    state.return_docker(docker).await;
    result
}
