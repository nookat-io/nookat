pub mod engine;

use crate::entities::{DockerInfo, EngineInfo, EngineStatus};
use crate::services::engine_state_monitor::EngineStateMonitor;
use crate::state::SharedEngineState;
pub use engine::*;
use std::sync::Arc;
use tauri::State;
use tauri_plugin_opener::OpenerExt;
use tokio::sync::Mutex;
use tracing::instrument;

lazy_static::lazy_static! {
    static ref ENGINE_STATE_MONITOR: Arc<Mutex<Option<Arc<EngineStateMonitor>>>> = Arc::new(Mutex::new(None));
}

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
        _ => {
            return Err("DockerInfo is not available".to_string());
        }
    }
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_engine_state_monitoring(
    app: tauri::AppHandle,
    state: State<'_, SharedEngineState>,
) -> Result<(), String> {
    let monitor = {
        let mut guard = ENGINE_STATE_MONITOR.lock().await;
        if guard.as_ref().is_some() {
            return Ok(());
        }
        let monitor = Arc::new(EngineStateMonitor::new(
            Arc::new(state.inner().clone()),
            app.clone(),
        ));
        *guard = Some(monitor.clone());
        monitor
    };

    if let Err(e) = monitor.start_monitoring().await {
        // rollback if startup failed
        let mut guard = ENGINE_STATE_MONITOR.lock().await;
        if guard
            .as_ref()
            .map(|m| Arc::ptr_eq(m, &monitor))
            .unwrap_or(false)
        {
            *guard = None;
        }
        return Err(format!("Failed to start engine state monitoring: {}", e));
    }

    Ok(())
}
