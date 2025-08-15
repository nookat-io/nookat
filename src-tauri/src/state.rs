use crate::entities::Engine;
use crate::services::engine;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::instrument;

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
        let mut engine_guard = self.engine.lock().await;

        if engine_guard.is_none() {
            let engine = engine::create().await?;
            *engine_guard = Some(engine);
        }

        match engine_guard.as_ref() {
            Some(engine) => Ok(engine.clone()),
            None => Err("Engine instance is not available".to_string()),
        }
    }

    #[instrument(skip_all)]
    pub async fn return_engine(&self, engine: Engine) {
        let mut engine_guard = self.engine.lock().await;
        *engine_guard = Some(engine);
    }
}
