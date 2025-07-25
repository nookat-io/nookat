use bollard::Docker;
use crate::{AppError, AppResult};
use log::{info, warn, error};

pub struct DockerService;

impl DockerService {
    /// Get a Docker connection with proper error handling
    pub fn connect() -> AppResult<Docker> {
        match Docker::connect_with_local_defaults() {
            Ok(docker) => {
                info!("Successfully connected to Docker daemon");
                Ok(docker)
            }
            Err(e) => {
                error!("Failed to connect to Docker daemon: {}", e);
                match e {
                    bollard::errors::Error::DockerResponseServerError { status_code: 404, .. } => {
                        Err(AppError::OperationFailed("Docker daemon not found. Please ensure Docker is installed and running.".to_string()))
                    }
                    _ => Err(AppError::DockerConnection(e))
                }
            }
        }
    }
    
    /// Test Docker connection and return status
    pub async fn test_connection() -> AppResult<bool> {
        let docker = Self::connect()?;
        match docker.ping().await {
            Ok(_) => {
                info!("Docker daemon is responsive");
                Ok(true)
            }
            Err(e) => {
                warn!("Docker daemon ping failed: {}", e);
                Err(AppError::DockerConnection(e))
            }
        }
    }
    
    /// Validate container ID format
    pub fn validate_container_id(id: &str) -> AppResult<()> {
        if id.is_empty() {
            return Err(AppError::ContainerValidation {
                reason: "Container ID cannot be empty".to_string(),
            });
        }
        
        if id.len() < 12 {
            return Err(AppError::ContainerValidation {
                reason: "Container ID must be at least 12 characters".to_string(),
            });
        }
        
        if !id.chars().all(|c| c.is_ascii_hexdigit()) {
            return Err(AppError::ContainerValidation {
                reason: "Container ID must contain only hexadecimal characters".to_string(),
            });
        }
        
        Ok(())
    }
    
    /// Validate multiple container IDs
    pub fn validate_container_ids(ids: &[String]) -> AppResult<()> {
        if ids.is_empty() {
            return Err(AppError::ContainerValidation {
                reason: "At least one container ID is required".to_string(),
            });
        }
        
        for id in ids {
            Self::validate_container_id(id)?;
        }
        
        Ok(())
    }
}