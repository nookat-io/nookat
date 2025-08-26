pub mod engine;

use crate::entities::{DockerInfo, EngineInfo, EngineStatus};
use crate::services::engine_state_monitor::EngineStateMonitor;
use crate::services::websocket::WebSocketManager;
use crate::state::SharedEngineState;
pub use engine::*;
use std::sync::Arc;
use tauri::State;
use tauri_plugin_opener::OpenerExt;
use tokio::sync::Mutex;
use tracing::instrument;

// Global WebSocket manager instance
lazy_static::lazy_static! {
    static ref WEBSOCKET_MANAGER: Arc<WebSocketManager> = Arc::new(WebSocketManager::new());
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

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_websocket_server(port: u16) -> Result<(), String> {
    WEBSOCKET_MANAGER
        .start_server(port)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn broadcast_websocket_message(
    message_type: String,
    payload: serde_json::Value,
) -> Result<(), String> {
    if let Some(server) = WEBSOCKET_MANAGER.get_server().await {
        let message = crate::services::websocket::WebSocketMessage {
            message_type,
            payload,
            timestamp: chrono::Utc::now().timestamp() as u64,
        };
        let message_json = serde_json::to_string(&message)
            .map_err(|e| format!("Failed to serialize message: {}", e))?;
        server
            .broadcast_message(&message_json)
            .await
            .map_err(|e| e.to_string())
    } else {
        Err("WebSocket server not running".to_string())
    }
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_websocket_timestamp_service(port: u16) -> Result<(), String> {
    WEBSOCKET_MANAGER
        .start_server(port)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_websocket_status() -> Result<serde_json::Value, String> {
    let is_running = WEBSOCKET_MANAGER.is_server_running().await;

    if let Some(server) = WEBSOCKET_MANAGER.get_server().await {
        let connections = server.connections.read().await.len();
        Ok(serde_json::json!({
            "status": if is_running { "running" } else { "stopped" },
            "connections": connections,
            "uptime": chrono::Utc::now().timestamp()
        }))
    } else {
        Ok(serde_json::json!({
            "status": "stopped",
            "connections": 0,
            "uptime": 0
        }))
    }
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_engine_state_monitoring(
    app: tauri::AppHandle,
    _state: State<'_, SharedEngineState>,
) -> Result<(), String> {
    let mut monitor_guard = ENGINE_STATE_MONITOR.lock().await;

    if monitor_guard.is_none() {
        // Create a new SharedEngineState instance
        let shared_state = SharedEngineState::new(app);

        let monitor = Arc::new(EngineStateMonitor::new(
            WEBSOCKET_MANAGER.clone(),
            Arc::new(shared_state),
        ));

        monitor
            .start_monitoring()
            .await
            .map_err(|e| format!("Failed to start engine state monitoring: {}", e))?;

        *monitor_guard = Some(monitor);
    }

    Ok(())
}
