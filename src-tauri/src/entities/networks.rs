use bollard::models::Network;
use bollard::network::ListNetworksOptions;

use bollard::Docker;

async fn get_networks() -> Vec<Network> {
    let docker = Docker::connect_with_local_defaults().unwrap();

    let options: ListNetworksOptions<String> = ListNetworksOptions::default();

    let networks: Vec<bollard::models::Network> =
        docker.list_networks(Some(options)).await.unwrap();
    return networks;
}

#[tauri::command]
pub async fn list_networks() -> Vec<Network> {
    println!("Listing networks");

    let networks = get_networks().await;
    return networks;
}
