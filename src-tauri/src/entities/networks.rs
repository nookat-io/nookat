use bollard::network::ListNetworksOptions;
use serde::{Deserialize, Serialize};
use crate::{AppError, AppResult};
use crate::services::DockerService;
use log::{info, error, debug};

#[derive(Serialize, Deserialize, Debug)]
pub struct Network {
    pub id: String,
    pub name: String,
    pub driver: String,
    pub scope: String,
}

#[tauri::command]
pub async fn list_networks() -> Result<Vec<Network>, AppError> {
    info!("Listing Docker networks");
    
    let docker = DockerService::connect()?;

    let options: ListNetworksOptions<String> = ListNetworksOptions::default();

    let networks = docker
        .list_networks(Some(options))
        .await
        .map_err(|e| {
            error!("Failed to list networks: {}", e);
            AppError::DockerConnection(e)
        })?;

    let processed_networks: Vec<Network> = networks
        .into_iter()
        .map(|network| Network {
            id: network.id.unwrap_or_default(),
            name: network.name.unwrap_or_default(),
            driver: network.driver.unwrap_or_default(),
            scope: network.scope.unwrap_or_default(),
        })
        .collect();

    debug!("Found {} networks", processed_networks.len());
    info!("Successfully listed {} networks", processed_networks.len());
    Ok(processed_networks)
}
