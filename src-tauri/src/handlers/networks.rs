use crate::entities::Network;
use crate::services::NetworksService;
use crate::state::SharedDockerState;
use tauri::State;

#[tauri::command]
pub async fn list_networks(state: State<'_, SharedDockerState>) -> Result<Vec<Network>, String> {
    println!("Listing networks");

    let docker = state.get_docker().await?;
    let result = NetworksService::get_networks(&docker).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn remove_network(
    state: State<'_, SharedDockerState>,
    name: String,
) -> Result<(), String> {
    println!("Removing network: {}", name);

    let docker = state.get_docker().await?;
    let result = NetworksService::remove_network(&docker, &name).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn bulk_remove_networks(
    state: State<'_, SharedDockerState>,
    names: Vec<String>,
) -> Result<(), String> {
    println!("Removing networks: {:?}", names);

    let docker = state.get_docker().await?;
    let result = NetworksService::bulk_remove_networks(&docker, &names).await;
    state.return_docker(docker).await;
    result
}
