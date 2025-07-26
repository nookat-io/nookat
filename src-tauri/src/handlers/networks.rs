use crate::services::NetworksService;
use crate::entities::Network;

#[tauri::command]
pub async fn list_networks() -> Result<Vec<Network>, String> {
    println!("Listing networks");

    let service = NetworksService::default();
    let networks = service.get_networks().await.map_err(|e| e.to_string())?;
    println!("Number of networks: {:?}", networks.len());
    Ok(networks)
}

#[tauri::command]
pub async fn remove_network(name: String) -> Result<(), String> {
    println!("Removing network: {}", name);

    let service = NetworksService::default();
    service.remove_network(&name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn bulk_remove_networks(names: Vec<String>) -> Result<(), String> {
    println!("Removing networks: {:?}", names);

    let service = NetworksService::default();
    service.bulk_remove_networks(&names).await.map_err(|e| e.to_string())
}
