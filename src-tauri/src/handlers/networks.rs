// use crate::services::NetworksService;
use crate::entities::Network;

#[tauri::command]
pub async fn list_networks() -> Vec<Network> {
    println!("Listing networks");

    // let networks = NetworksService::get_networks().await;
    // return networks;
    todo!()
}
