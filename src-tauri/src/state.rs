use crate::entities::Engine;
use crate::services::engine;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::Mutex;
use tracing::{debug, instrument, warn};

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

        if engine_guard.is_none() {
            warn!("Engine is not found, creating new one");
            let engine = Arc::new(engine::create_engine(&self.app_handle).await?);
            *engine_guard = Some(engine);
        }

        match engine_guard.as_ref() {
            Some(engine) => {
                debug!("Engine is found, checking if it is running");
                if engine.is_running() {
                    debug!("Engine is running, returning it");
                    Ok(engine.clone().into())
                } else {
                    debug!("Engine is not running, trying to create a new one");
                    let new_engine = Arc::new(engine::create_engine(&self.app_handle).await?);
                    *engine_guard = Some(new_engine);
                    Ok(engine_guard.as_ref().unwrap().clone())
                }
            }
            None => Err("Engine instance is not available".to_string()),
        }
    }
}
