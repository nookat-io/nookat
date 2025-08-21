pub mod engine;

use crate::entities::{DockerInfo, EngineInfo, EngineStatus};
use crate::state::SharedEngineState;
pub use engine::*;
use tauri::State;
use tauri_plugin_opener::OpenerExt;
use tracing::instrument;

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if url.trim().is_empty() {
        return Err("URL cannot be empty".to_string());
    }

    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| format!("Failed to open URL: {}", e))
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_docker_info(state: State<'_, SharedEngineState>) -> Result<DockerInfo, String> {
    let engine = state.get_engine().await?;

    let result = match engine.engine_status {
        EngineStatus::Running(EngineInfo::Docker) => {
            let docker = engine.docker.as_ref().ok_or("Docker not found")?;
            let info = docker
                .info()
                .await
                .map_err(|e| format!("Failed to get Docker info: {}", e))?;
            let version = docker
                .version()
                .await
                .map_err(|e| format!("Failed to get Docker version: {}", e))?;
            Ok(DockerInfo::from((info, version)))
        }
        _ => {
            return Err("DockerInfo is not available".to_string());
        }
    };
    result
}
