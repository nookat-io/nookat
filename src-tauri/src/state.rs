use crate::entities::Engine;
use crate::services::engine;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{info, instrument};

#[derive(Default)]
pub struct SharedEngineState {
    engine: Arc<Mutex<Option<Engine>>>,
}

impl SharedEngineState {
    pub fn new() -> Self {
        Self {
            engine: Arc::new(Mutex::new(None)),
        }
    }

    #[instrument(skip_all, err)]
    pub async fn get_engine(&self) -> Result<Engine, String> {
        info!("Getting engine");
        let mut engine_guard = self.engine.lock().await;

        if engine_guard.is_none() {
            info!("Engine is not found, creating new one");
            let engine = engine::create_engine().await?;
            *engine_guard = Some(engine);
        }

        match engine_guard.as_ref() {
            Some(engine) => {
                info!("Engine is found, checking if it is running");
                if engine.is_running() {
                    info!("Engine is running, returning it");
                    Ok(engine.clone())
                } else {
                    info!("Engine is not running, trying to create a new one");
                    let new_engine = engine::create_engine().await?;
                    *engine_guard = Some(new_engine);
                    Ok(engine_guard.as_ref().unwrap().clone())
                }
            },
            None => Err("Engine instance is not available".to_string()),
        }
    }

    #[instrument(skip_all)]
    pub async fn return_engine(&self, engine: Engine) {
        let mut engine_guard = self.engine.lock().await;
        *engine_guard = Some(engine);
    }
}
