use crate::entities::Engine;
use crate::services::engine;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::Mutex;
use tracing::{debug, instrument};

#[derive(Clone)]
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

        // First, check if engine exists and is running without holding the lock
        {
            let engine_guard = self.engine.lock().await;
            if let Some(ref engine) = *engine_guard {
                if engine.is_running() {
                    debug!("Engine exists and is running, returning existing instance");
                    return Ok(engine.clone());
                }
            }
        } // Guard is dropped here

        // Engine doesn't exist or isn't running, need to create one
        debug!("Creating new engine instance");
        let new_engine = Arc::new(engine::create_engine(&self.app_handle).await?);

        // Reacquire the mutex and handle race conditions
        let mut engine_guard = self.engine.lock().await;

        // Check if another task created an engine while we were waiting
        if let Some(ref existing_engine) = *engine_guard {
            if existing_engine.is_running() {
                debug!(
                    "Another task created engine while we were waiting, using existing instance"
                );
                return Ok(existing_engine.clone());
            }
        }

        // Set our newly created engine
        debug!("Setting newly created engine instance");
        *engine_guard = Some(new_engine.clone());

        Ok(new_engine)
    }
}
