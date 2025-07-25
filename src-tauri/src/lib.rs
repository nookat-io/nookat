mod entities;
mod handlers;
mod services;
mod config;

use crate::entities::list_images;
use crate::entities::list_networks;
use crate::entities::list_volumes;
use crate::handlers::{
    container_files, container_logs, list_containers, open_terminal, remove_container,
    restart_container, start_container, stop_container, pause_container, unpause_container,
    force_remove_container, bulk_start_containers, bulk_stop_containers, bulk_pause_containers,
    bulk_unpause_containers, bulk_restart_containers, bulk_remove_containers, bulk_force_remove_containers,
    prune_containers,
};

use log::info;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Docker connection failed: {0}")]
    DockerConnection(#[from] bollard::errors::Error),
    #[error("Container not found: {id}")]
    ContainerNotFound { id: String },
    #[error("Container validation failed: {reason}")]
    ContainerValidation { reason: String },
    #[error("Operation failed: {0}")]
    OperationFailed(String),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

pub type AppResult<T> = Result<T, AppError>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();
    info!("Starting Nookat application");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Containers
            list_containers,
            start_container,
            stop_container,
            pause_container,
            unpause_container,
            restart_container,
            bulk_start_containers,
            bulk_stop_containers,
            bulk_pause_containers,
            bulk_unpause_containers,
            bulk_restart_containers,
            bulk_remove_containers,
            bulk_force_remove_containers,
            open_terminal,
            container_logs,
            container_files,
            remove_container,
            force_remove_container,
            prune_containers,
            // Images
            list_images,
            list_networks,
            list_volumes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
