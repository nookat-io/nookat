use bollard::volume::ListVolumesOptions;
use serde::{Deserialize, Serialize};
use crate::{AppError, AppResult};
use crate::services::DockerService;
use log::{info, error, debug};

#[derive(Serialize, Deserialize, Debug)]
pub struct Volume {
    pub name: String,
    pub driver: String,
    pub mountpoint: String,
    pub scope: String,
}

#[tauri::command]
pub async fn list_volumes() -> Result<Vec<Volume>, AppError> {
    info!("Listing Docker volumes");
    
    let docker = DockerService::connect()?;

    let options: ListVolumesOptions<String> = ListVolumesOptions::default();

    let volumes_response = docker
        .list_volumes(Some(options))
        .await
        .map_err(|e| {
            error!("Failed to list volumes: {}", e);
            AppError::DockerConnection(e)
        })?;

    let processed_volumes: Vec<Volume> = volumes_response
        .volumes
        .unwrap_or_default()
        .into_iter()
        .map(|volume| Volume {
            name: volume.name,
            driver: volume.driver,
            mountpoint: volume.mountpoint,
            scope: volume.scope.unwrap_or_default(),
        })
        .collect();

    debug!("Found {} volumes", processed_volumes.len());
    info!("Successfully listed {} volumes", processed_volumes.len());
    Ok(processed_volumes)
}
