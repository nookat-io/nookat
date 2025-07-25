use crate::entities::Container;
use crate::services::ContainersService;
use crate::{AppError, AppResult};
use log::{info, warn, error};
use std::collections::HashMap;

#[tauri::command]
pub async fn list_containers() -> Result<Vec<Container>, AppError> {
    info!("Listing containers");

    let containers = ContainersService::get_containers().await?;
    let result: Vec<Container> = containers.into_iter().map(|c| c.into()).collect();
    
    info!("Successfully listed {} containers", result.len());
    Ok(result)
}

#[tauri::command]
pub async fn start_container(id: String) -> Result<(), AppError> {
    info!("Starting container: {}", id);
    ContainersService::start_container(&id).await
}

#[tauri::command]
pub async fn stop_container(id: String) -> Result<(), AppError> {
    info!("Stopping container: {}", id);
    ContainersService::stop_container(&id).await
}

#[tauri::command]
pub async fn pause_container(id: String) -> Result<(), AppError> {
    info!("Pausing container: {}", id);
    ContainersService::pause_container(&id).await
}

#[tauri::command]
pub async fn unpause_container(id: String) -> Result<(), AppError> {
    info!("Unpausing container: {}", id);
    ContainersService::unpause_container(&id).await
}

#[tauri::command]
pub async fn restart_container(id: String) -> Result<(), AppError> {
    info!("Restarting container: {}", id);
    ContainersService::restart_container(&id).await
}

// Bulk operation result structure
#[derive(serde::Serialize)]
pub struct BulkOperationResult {
    pub successful: Vec<String>,
    pub failed: Vec<BulkOperationError>,
    pub total: usize,
    pub success_count: usize,
    pub failure_count: usize,
}

#[derive(serde::Serialize)]
pub struct BulkOperationError {
    pub container_id: String,
    pub error: String,
}

impl BulkOperationResult {
    fn new(total: usize) -> Self {
        Self {
            successful: Vec::new(),
            failed: Vec::new(),
            total,
            success_count: 0,
            failure_count: 0,
        }
    }
    
    fn add_success(&mut self, container_id: String) {
        self.successful.push(container_id);
        self.success_count += 1;
    }
    
    fn add_failure(&mut self, container_id: String, error: String) {
        self.failed.push(BulkOperationError { container_id, error });
        self.failure_count += 1;
    }
    
    fn is_partial_success(&self) -> bool {
        self.success_count > 0 && self.failure_count > 0
    }
    
    fn is_complete_failure(&self) -> bool {
        self.failure_count == self.total
    }
}

#[tauri::command]
pub async fn bulk_start_containers(ids: Vec<String>) -> Result<BulkOperationResult, AppError> {
    info!("Starting {} containers", ids.len());
    
    let mut result = BulkOperationResult::new(ids.len());
    
    for id in ids {
        match ContainersService::start_container(&id).await {
            Ok(()) => {
                info!("Successfully started container: {}", id);
                result.add_success(id);
            }
            Err(e) => {
                warn!("Failed to start container {}: {}", id, e);
                result.add_failure(id, e.to_string());
            }
        }
    }
    
    info!("Bulk start completed: {}/{} successful", result.success_count, result.total);
    Ok(result)
}

#[tauri::command]
pub async fn bulk_stop_containers(ids: Vec<String>) -> Result<BulkOperationResult, AppError> {
    info!("Stopping {} containers", ids.len());
    
    let mut result = BulkOperationResult::new(ids.len());
    
    for id in ids {
        match ContainersService::stop_container(&id).await {
            Ok(()) => {
                info!("Successfully stopped container: {}", id);
                result.add_success(id);
            }
            Err(e) => {
                warn!("Failed to stop container {}: {}", id, e);
                result.add_failure(id, e.to_string());
            }
        }
    }
    
    info!("Bulk stop completed: {}/{} successful", result.success_count, result.total);
    Ok(result)
}

#[tauri::command]
pub async fn bulk_pause_containers(ids: Vec<String>) -> Result<BulkOperationResult, AppError> {
    info!("Pausing {} containers", ids.len());
    
    let mut result = BulkOperationResult::new(ids.len());
    
    for id in ids {
        match ContainersService::pause_container(&id).await {
            Ok(()) => {
                info!("Successfully paused container: {}", id);
                result.add_success(id);
            }
            Err(e) => {
                warn!("Failed to pause container {}: {}", id, e);
                result.add_failure(id, e.to_string());
            }
        }
    }
    
    info!("Bulk pause completed: {}/{} successful", result.success_count, result.total);
    Ok(result)
}

#[tauri::command]
pub async fn bulk_unpause_containers(ids: Vec<String>) -> Result<BulkOperationResult, AppError> {
    info!("Unpausing {} containers", ids.len());
    
    let mut result = BulkOperationResult::new(ids.len());
    
    for id in ids {
        match ContainersService::unpause_container(&id).await {
            Ok(()) => {
                info!("Successfully unpaused container: {}", id);
                result.add_success(id);
            }
            Err(e) => {
                warn!("Failed to unpause container {}: {}", id, e);
                result.add_failure(id, e.to_string());
            }
        }
    }
    
    info!("Bulk unpause completed: {}/{} successful", result.success_count, result.total);
    Ok(result)
}

#[tauri::command]
pub async fn bulk_restart_containers(ids: Vec<String>) -> Result<BulkOperationResult, AppError> {
    info!("Restarting {} containers", ids.len());
    
    let mut result = BulkOperationResult::new(ids.len());
    
    for id in ids {
        match ContainersService::restart_container(&id).await {
            Ok(()) => {
                info!("Successfully restarted container: {}", id);
                result.add_success(id);
            }
            Err(e) => {
                warn!("Failed to restart container {}: {}", id, e);
                result.add_failure(id, e.to_string());
            }
        }
    }
    
    info!("Bulk restart completed: {}/{} successful", result.success_count, result.total);
    Ok(result)
}

#[tauri::command]
pub async fn bulk_remove_containers(ids: Vec<String>) -> Result<BulkOperationResult, AppError> {
    info!("Removing {} containers", ids.len());
    
    let mut result = BulkOperationResult::new(ids.len());
    
    for id in ids {
        match ContainersService::remove_container(&id).await {
            Ok(()) => {
                info!("Successfully removed container: {}", id);
                result.add_success(id);
            }
            Err(e) => {
                warn!("Failed to remove container {}: {}", id, e);
                result.add_failure(id, e.to_string());
            }
        }
    }
    
    info!("Bulk remove completed: {}/{} successful", result.success_count, result.total);
    Ok(result)
}

#[tauri::command]
pub async fn bulk_force_remove_containers(ids: Vec<String>) -> Result<BulkOperationResult, AppError> {
    info!("Force removing {} containers", ids.len());
    
    let mut result = BulkOperationResult::new(ids.len());
    
    for id in ids {
        match ContainersService::force_remove_container(&id).await {
            Ok(()) => {
                info!("Successfully force removed container: {}", id);
                result.add_success(id);
            }
            Err(e) => {
                warn!("Failed to force remove container {}: {}", id, e);
                result.add_failure(id, e.to_string());
            }
        }
    }
    
    info!("Bulk force remove completed: {}/{} successful", result.success_count, result.total);
    Ok(result)
}

#[tauri::command]
pub async fn open_terminal(id: String) -> Result<(), AppError> {
    info!("Opening terminal for container: {}", id);
    ContainersService::open_terminal(&id).await
}

#[tauri::command]
pub async fn container_logs(id: String) -> Result<Vec<String>, AppError> {
    info!("Getting container logs: {}", id);
    ContainersService::get_container_logs(&id).await
}

#[tauri::command]
pub async fn container_files(id: String) -> Result<HashMap<String, serde_json::Value>, AppError> {
    info!("Getting container files: {}", id);
    ContainersService::get_container_files(&id).await
}

#[tauri::command]
pub async fn remove_container(id: String) -> Result<(), AppError> {
    info!("Removing container: {}", id);
    ContainersService::remove_container(&id).await
}

#[tauri::command]
pub async fn force_remove_container(id: String) -> Result<(), AppError> {
    info!("Force removing container: {}", id);
    ContainersService::force_remove_container(&id).await
}

#[tauri::command]
pub async fn prune_containers() -> Result<(), AppError> {
    info!("Cleaning up stopped containers");
    ContainersService::prune_containers().await
}
