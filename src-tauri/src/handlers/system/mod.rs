pub mod engine;

use crate::entities::{DockerInfo, EngineInfo, EngineStatus};
use crate::services::engine_state_monitor::EngineStateMonitor;
use crate::state::SharedEngineState;
pub use engine::*;
use std::sync::Arc;
use tauri::State;
use tauri_plugin_opener::OpenerExt;
use tokio::sync::Mutex;
use tracing::{info, instrument};

static ENGINE_STATE_MONITOR: Mutex<Option<Arc<EngineStateMonitor>>> = Mutex::const_new(None);

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
#[instrument(skip_all)]
pub async fn restart_app(app: tauri::AppHandle) {
    info!("Restarting to run the installed update");
    app.request_restart();
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_docker_info(state: State<'_, SharedEngineState>) -> Result<DockerInfo, String> {
    let engine = state.get_engine().await?;

    match engine.engine_status {
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
        _ => Err("DockerInfo is not available".to_string()),
    }
}

pub(crate) async fn engine_state_monitor(
    app: &tauri::AppHandle,
    state: &SharedEngineState,
) -> Arc<EngineStateMonitor> {
    ENGINE_STATE_MONITOR
        .lock()
        .await
        .get_or_insert_with(|| {
            Arc::new(EngineStateMonitor::new(
                Arc::new(state.clone()),
                app.clone(),
            ))
        })
        .clone()
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_engine_state_monitoring(
    app: tauri::AppHandle,
    state: State<'_, SharedEngineState>,
) -> Result<(), String> {
    engine_state_monitor(&app, state.inner())
        .await
        .start_monitoring()
        .await
        .map_err(|e| format!("Failed to start engine state monitoring: {}", e))
}
