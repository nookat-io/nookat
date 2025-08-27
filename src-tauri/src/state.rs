use crate::entities::Engine;
use crate::services::engine;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::Mutex;
use tracing::{debug, instrument};

pub struct SharedEngineState {
    engine: Arc<Mutex<Option<Arc<Engine>>>>,
    app_handle: Arc<AppHandle>,
}

impl SharedEngineState {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            engine: Arc::new(Mutex::new(None)),
            app_handle: Arc::new(app_handle),
        }
    }

    #[instrument(skip_all, err)]
    pub async fn get_engine(&self) -> Result<Arc<Engine>, String> {
        debug!("Getting engine");
        let mut engine_guard = self.engine.lock().await;

        // Create engine if it doesn't exist or isn't running
        if engine_guard.is_none() || !engine_guard.as_ref().unwrap().is_running() {
            debug!("Creating new engine instance");
            let engine = Arc::new(engine::create_engine(&self.app_handle).await?);
            *engine_guard = Some(engine);
        }

        engine_guard
            .as_ref()
            .cloned()
            .ok_or_else(|| "Failed to create engine instance".to_string())
    }
}
