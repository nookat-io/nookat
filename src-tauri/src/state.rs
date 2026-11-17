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

        if let Some(engine) = running(&*self.engine.lock().await) {
            debug!("Engine exists and is running, returning existing instance");
            return Ok(engine);
        }

        debug!("Creating new engine instance");
        let new_engine = Arc::new(engine::create_engine(&self.app_handle).await?);

        let mut cached_engine = self.engine.lock().await;
        if let Some(engine) = running(&cached_engine) {
            debug!("Another task created engine while we were waiting, using existing instance");
            return Ok(engine);
        }

        debug!("Caching newly created engine instance");
        *cached_engine = Some(new_engine.clone());

        Ok(new_engine)
    }
}

fn running(engine: &Option<Arc<Engine>>) -> Option<Arc<Engine>> {
    engine
        .as_ref()
        .filter(|engine| engine.is_running())
        .cloned()
}
