use crate::entities::Engine;
use crate::services::engine;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::{futures::Notified, Mutex, Notify};
use tracing::{debug, instrument, warn};

const ENGINE_CONNECTED_EVENT: &str = "engine-connected";

#[derive(Clone)]
pub struct SharedEngineState {
    engine: Arc<Mutex<Option<Arc<Engine>>>>,
    connection_forgotten: Arc<Notify>,
    app_handle: Arc<AppHandle>,
}

impl SharedEngineState {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            engine: Arc::new(Mutex::new(None)),
            connection_forgotten: Arc::new(Notify::new()),
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
        drop(cached_engine);

        if new_engine.is_running() {
            self.announce_connection();
        }

        Ok(new_engine)
    }

    fn announce_connection(&self) {
        if let Err(e) = self.app_handle.emit(ENGINE_CONNECTED_EVENT, ()) {
            warn!("Failed to announce the engine connection: {}", e);
        }
    }

    #[instrument(skip_all)]
    pub async fn forget_connection(&self) {
        debug!("Forgetting the engine connection, the next request reconnects");
        *self.engine.lock().await = None;
        self.connection_forgotten.notify_waiters();
    }

    pub fn connection_forgotten(&self) -> Notified<'_> {
        self.connection_forgotten.notified()
    }
}

fn running(engine: &Option<Arc<Engine>>) -> Option<Arc<Engine>> {
    engine
        .as_ref()
        .filter(|engine| engine.is_running())
        .cloned()
}

#[derive(Default)]
pub struct RunningPulls {
    pulls: std::sync::Mutex<HashMap<String, Arc<Notify>>>,
}

impl RunningPulls {
    pub fn register(&self, pull_id: &str) -> RunningPull<'_> {
        let cancel = Arc::new(Notify::new());
        self.running()
            .insert(pull_id.to_string(), Arc::clone(&cancel));
        RunningPull {
            pulls: self,
            pull_id: pull_id.to_string(),
            cancel,
        }
    }

    pub fn cancel(&self, pull_id: &str) -> bool {
        let Some(cancel) = self.running().remove(pull_id) else {
            return false;
        };
        cancel.notify_one();
        true
    }

    fn running(&self) -> std::sync::MutexGuard<'_, HashMap<String, Arc<Notify>>> {
        self.pulls
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

pub struct RunningPull<'a> {
    pulls: &'a RunningPulls,
    pull_id: String,
    cancel: Arc<Notify>,
}

impl RunningPull<'_> {
    pub async fn cancelled(&self) {
        self.cancel.notified().await
    }
}

impl Drop for RunningPull<'_> {
    fn drop(&mut self) {
        self.pulls.running().remove(&self.pull_id);
    }
}

#[cfg(test)]
mod tests {
    use super::RunningPulls;
    use std::time::Duration;

    const WAIT: Duration = Duration::from_secs(1);

    #[tokio::test]
    async fn a_pull_cancelled_before_it_waits_still_sees_the_cancellation() {
        let pulls = RunningPulls::default();
        let pull = pulls.register("pull-1");

        assert!(pulls.cancel("pull-1"));

        tokio::time::timeout(WAIT, pull.cancelled())
            .await
            .expect("the pull should see its cancellation");
    }

    #[tokio::test]
    async fn cancelling_one_pull_leaves_the_others_running() {
        let pulls = RunningPulls::default();
        let _first = pulls.register("pull-1");
        let second = pulls.register("pull-2");

        assert!(pulls.cancel("pull-1"));

        assert!(
            tokio::time::timeout(Duration::from_millis(50), second.cancelled())
                .await
                .is_err()
        );
    }

    #[test]
    fn a_finished_or_unknown_pull_cannot_be_cancelled() {
        let pulls = RunningPulls::default();
        drop(pulls.register("pull-1"));

        assert!(!pulls.cancel("pull-1"));
        assert!(!pulls.cancel("never-started"));
    }
}
