use crate::entities::{Container, Engine, EngineState, Image, Network, Volume};
use crate::state::SharedEngineState;
use bollard::query_parameters::EventsOptions;
use bollard::Docker;
use chrono::Utc;
use futures_util::StreamExt;
use serde_json;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;
use tokio::sync::{Mutex, MutexGuard};
use tracing::{debug, error, info, warn};

pub struct EngineStateMonitor {
    state: Arc<SharedEngineState>,
    is_monitoring: Arc<Mutex<bool>>,
    last_state: Arc<Mutex<Option<EngineState>>>,
    app_handle: tauri::AppHandle,
}

impl EngineStateMonitor {
    pub fn new(state: Arc<SharedEngineState>, app_handle: tauri::AppHandle) -> Self {
        Self {
            state,
            is_monitoring: Arc::new(Mutex::new(false)),
            last_state: Arc::new(Mutex::new(None)),
            app_handle,
        }
    }

    /// Start monitoring Docker events and broadcasting state changes
    pub async fn start_monitoring(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut is_monitoring = self.is_monitoring.lock().await;

        if *is_monitoring {
            debug!("Engine state monitoring already running");
            return Ok(());
        }

        *is_monitoring = true;
        drop(is_monitoring);

        let state = self.state.clone();
        let is_monitoring = self.is_monitoring.clone();
        let last_state = self.last_state.clone();
        let app_handle = self.app_handle.clone();

        tokio::spawn(async move {
            if let Err(e) = Self::monitor_loop(state, is_monitoring, last_state, app_handle).await {
                error!("Engine state monitoring error: {}", e);
            }
        });

        debug!("Engine state monitoring started");
        Ok(())
    }

    /// Main monitoring loop that watches Docker events and polls state periodically
    async fn monitor_loop(
        state: Arc<SharedEngineState>,
        is_monitoring: Arc<Mutex<bool>>,
        last_state: Arc<Mutex<Option<EngineState>>>,
        app_handle: tauri::AppHandle,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Start Docker events monitoring in a separate task
        let state_events = state.clone();
        let last_state_events = last_state.clone();
        let is_monitoring_events = is_monitoring.clone();
        let app_handle_events = app_handle.clone();

        let mut docker_events_task = tokio::spawn(async move {
            Self::monitor_docker_events_continuously(
                state_events,
                last_state_events,
                is_monitoring_events,
                app_handle_events,
            )
            .await
        });

        // Emit initial baseline snapshot immediately for <50ms TTFU
        if let Err(e) = Self::publish_if_changed(&state, &last_state, &app_handle).await {
            warn!("Initial baseline snapshot error: {}", e);
        }

        // Main polling loop for periodic state checks
        let mut interval = tokio::time::interval(Duration::from_secs(5));
        let mut retry_count = 0u32;
        const BASE_BACKOFF_MS: u64 = 100;

        loop {
            interval.tick().await;

            // Check if we should stop monitoring
            {
                let monitoring = is_monitoring.lock().await;
                if !*monitoring {
                    break;
                }
            }

            // Check if Docker events monitoring task has failed and respawn it
            if docker_events_task.is_finished() {
                // Log the outcome and handle the old task
                match docker_events_task.await {
                    Ok(Ok(())) => {
                        debug!("Docker events monitoring completed successfully, respawning...");
                    }
                    Ok(Err(e)) => {
                        warn!("Docker events monitoring failed: {}, respawning...", e);
                        retry_count = retry_count.saturating_add(1);
                    }
                    Err(e) => {
                        error!(
                            "Docker events monitoring task panicked: {}, respawning...",
                            e
                        );
                        retry_count = retry_count.saturating_add(1);
                    }
                };

                // Apply exponential backoff to avoid tight restart loops
                if retry_count > 0 {
                    let backoff_duration =
                        Duration::from_millis(BASE_BACKOFF_MS * 2_u64.pow(retry_count.min(5)));
                    debug!(
                        "Waiting {}ms before respawning Docker events monitoring",
                        backoff_duration.as_millis()
                    );
                    tokio::time::sleep(backoff_duration).await;
                }

                // Spawn a new Docker events monitoring task
                let state_events = state.clone();
                let last_state_events = last_state.clone();
                let is_monitoring_events = is_monitoring.clone();
                let app_handle_events = app_handle.clone();

                docker_events_task = tokio::spawn(async move {
                    Self::monitor_docker_events_continuously(
                        state_events,
                        last_state_events,
                        is_monitoring_events,
                        app_handle_events,
                    )
                    .await
                });

                debug!(
                    "Docker events monitoring task respawned (attempt {})",
                    retry_count + 1
                );

                // Reset retry count on successful respawn if we've had some failures
                if retry_count > 0 {
                    retry_count = 0;
                }
            }

            // Publish any change, including a status-only snapshot while Docker
            // is unavailable, so the UI can reflect Unknown/NotRunning
            if let Err(e) = Self::publish_if_changed(&state, &last_state, &app_handle).await {
                warn!("State change check error: {}", e);
            }
        }

        Ok(())
    }

    /// Continuously monitor Docker events
    async fn monitor_docker_events_continuously(
        state: Arc<SharedEngineState>,
        last_state: Arc<Mutex<Option<EngineState>>>,
        is_monitoring: Arc<Mutex<bool>>,
        app_handle: tauri::AppHandle,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut consecutive_failures = 0;
        const MAX_CONSECUTIVE_FAILURES: u32 = 5;

        loop {
            // Check if we should stop monitoring
            {
                let monitoring = is_monitoring.lock().await;
                if !*monitoring {
                    break;
                }
            }

            // Try to get the engine and start monitoring
            match state.get_engine().await {
                Ok(engine) => {
                    if let Some(docker) = &engine.docker {
                        consecutive_failures = 0;

                        if let Err(e) =
                            Self::monitor_docker_events(docker, &state, &last_state, &app_handle)
                                .await
                        {
                            warn!("Docker events monitoring error: {}", e);
                            consecutive_failures += 1;

                            if consecutive_failures >= MAX_CONSECUTIVE_FAILURES {
                                error!("Too many consecutive Docker monitoring failures ({}), stopping monitoring", consecutive_failures);
                                break;
                            }

                            let delay = Duration::from_secs(2_u64.pow(consecutive_failures));
                            tokio::time::sleep(delay).await;
                        }
                    } else {
                        consecutive_failures += 1;
                        if consecutive_failures >= MAX_CONSECUTIVE_FAILURES {
                            error!("No Docker instance available after {} attempts, stopping monitoring", consecutive_failures);
                            break;
                        }

                        let delay = Duration::from_secs(2_u64.pow(consecutive_failures));
                        tokio::time::sleep(delay).await;
                    }
                }
                Err(e) => {
                    consecutive_failures += 1;

                    if consecutive_failures >= MAX_CONSECUTIVE_FAILURES {
                        error!(
                            "Engine not available after {} attempts: {}. Stopping monitoring.",
                            consecutive_failures, e
                        );
                        break;
                    }

                    let delay = Duration::from_secs(2_u64.pow(consecutive_failures));
                    tokio::time::sleep(delay).await;
                }
            }
        }

        info!("Docker events monitoring stopped");
        Ok(())
    }

    /// Monitor Docker events and broadcast state changes
    async fn monitor_docker_events(
        docker: &Docker,
        state: &Arc<SharedEngineState>,
        last_state: &Arc<Mutex<Option<EngineState>>>,
        app_handle: &tauri::AppHandle,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let options = EventsOptions {
            since: None,
            until: None,
            filters: None,
        };

        let mut events = docker.events(Some(options));

        // Add a timeout for the first event to detect connection issues quickly
        let first_event_timeout =
            tokio::time::timeout(Duration::from_secs(10), events.next()).await;

        match first_event_timeout {
            Ok(Some(event_result)) => {
                // First event received, process it then continue monitoring normally
                match event_result {
                    Ok(_event) => {
                        debug!("Docker event received, broadcasting state update");

                        if let Err(e) =
                            Self::publish_if_changed(state, last_state, app_handle).await
                        {
                            error!("Failed to broadcast updated state: {}", e);
                        }
                    }
                    Err(e) => {
                        // Log but do not return; proceed into main loop
                        warn!("Error reading first Docker event: {}", e);
                    }
                }
            }
            Ok(None) => {
                // No events available yet; proceed to the main loop
                debug!("No Docker events available");
            }
            Err(_) => {
                // Timeout occurred; proceed to the main loop
                debug!("No Docker events received within timeout window; continuing to monitor");
            }
        }

        // Shared main loop for subsequent events
        while let Some(event_result) = events.next().await {
            match event_result {
                Ok(_event) => {
                    debug!("Docker event received, broadcasting state update");

                    if let Err(e) = Self::publish_if_changed(state, last_state, app_handle).await {
                        error!("Failed to broadcast updated state: {}", e);
                    }
                }
                Err(e) => {
                    // Non-fatal read error; log and continue
                    warn!("Error reading Docker event: {}", e);
                    continue;
                }
            }
        }

        Ok(())
    }

    /// Reads the engine state now and publishes it whether or not it changed,
    /// so a frontend that missed earlier pushes, such as one that just
    /// reloaded, gets the current state in the same version sequence as the
    /// pushes. Returns the published snapshot.
    pub async fn refresh(&self) -> Result<EngineState, Box<dyn std::error::Error + Send + Sync>> {
        let (mut last_state, current) = Self::lock_and_read(&self.state, &self.last_state).await?;
        Ok(Self::publish(&mut last_state, current, &self.app_handle)?.clone())
    }

    /// Reads the engine state and publishes it if it changed since the last
    /// published snapshot.
    async fn publish_if_changed(
        state: &SharedEngineState,
        last_state: &Mutex<Option<EngineState>>,
        app_handle: &tauri::AppHandle,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let (mut last_state, current) = Self::lock_and_read(state, last_state).await?;

        let changed = last_state
            .as_ref()
            .is_none_or(|previous| Self::has_state_changed(previous, &current));
        if changed {
            let published = Self::publish(&mut last_state, current, app_handle)?;
            debug!(
                "Engine state {} broadcasted via Tauri event",
                published.version
            );
        }

        Ok(())
    }

    /// Takes the publication lock, then reads the engine and its state.
    ///
    /// The engine is read only after the lock is held, and the lock is held
    /// until the caller publishes or drops the guard, see `publish`.
    async fn lock_and_read<'a>(
        state: &SharedEngineState,
        last_state: &'a Mutex<Option<EngineState>>,
    ) -> Result<
        (MutexGuard<'a, Option<EngineState>>, EngineState),
        Box<dyn std::error::Error + Send + Sync>,
    > {
        let last_state = last_state.lock().await;
        let engine = state.get_engine().await?;
        let current = Self::read_engine_state(&engine).await?;
        Ok((last_state, current))
    }

    /// A minimal EngineState that carries only the engine status, for when
    /// Docker is unavailable.
    fn status_only_state(engine: &Engine) -> EngineState {
        EngineState {
            containers: HashMap::new(),
            images: HashMap::new(),
            volumes: HashMap::new(),
            networks: HashMap::new(),
            engine_status: engine.engine_status.clone(),
            docker_info: None,
            version: 0, // Assigned when the snapshot is published
            last_updated: Utc::now(),
        }
    }

    /// Stamps `snapshot` with the next version, emits it to the frontend and
    /// records it as the last published snapshot.
    ///
    /// Callers hold the `last_state` lock from reading the engine through this
    /// call, see `lock_and_read`. Reads and publishes therefore happen one at
    /// a time, in order, so a higher version always means a later read. The
    /// frontend applies a snapshot only if its version is higher than the one
    /// it already has, which keeps a slow read from replacing a newer snapshot.
    fn publish<'a>(
        last_state: &'a mut Option<EngineState>,
        mut snapshot: EngineState,
        app_handle: &tauri::AppHandle,
    ) -> Result<&'a EngineState, Box<dyn std::error::Error + Send + Sync>> {
        snapshot.version = last_state
            .as_ref()
            .map_or(1, |previous| previous.version + 1);
        app_handle.emit("engine_state_update", &serde_json::to_value(&snapshot)?)?;
        Ok(last_state.insert(snapshot))
    }

    /// Check if the state has meaningful changes
    fn has_state_changed(old_state: &EngineState, new_state: &EngineState) -> bool {
        // Check containers
        if old_state.containers.len() != new_state.containers.len() {
            return true;
        }

        for (id, new_container) in &new_state.containers {
            if let Some(old_container) = old_state.containers.get(id) {
                if old_container.state != new_container.state {
                    return true;
                }
            } else {
                return true; // New container
            }
        }

        // Check other entities for changes
        old_state.images.len() != new_state.images.len()
            || old_state.volumes.len() != new_state.volumes.len()
            || old_state.networks.len() != new_state.networks.len()
            || old_state.engine_status != new_state.engine_status
    }

    /// Reads the state of `engine`: every entity from Docker, or only the
    /// status when Docker is unavailable.
    async fn read_engine_state(
        engine: &Engine,
    ) -> Result<EngineState, Box<dyn std::error::Error + Send + Sync>> {
        let Some(docker) = &engine.docker else {
            return Ok(Self::status_only_state(engine));
        };

        // Fetch all Docker entities concurrently
        let (containers_result, images_result, volumes_result, networks_result) = tokio::try_join!(
            Self::fetch_containers(docker),
            Self::fetch_images(docker),
            Self::fetch_volumes(docker),
            Self::fetch_networks(docker)
        )?;

        // Convert to EngineState format
        let engine_state = EngineState {
            containers: {
                let mut map: HashMap<String, Container> = HashMap::new();
                for (index, c) in containers_result.into_iter().enumerate() {
                    let container: Container = c.into();
                    if let Some(id) = &container.id {
                        if !id.is_empty() {
                            map.insert(id.clone(), container);
                        } else {
                            // Generate fallback key for containers with empty ID
                            map.insert(format!("container_{}", index), container);
                        }
                    } else {
                        // Generate fallback key for containers without ID
                        map.insert(format!("container_{}", index), container);
                    }
                }
                map
            },
            images: {
                let mut map: HashMap<String, Image> = HashMap::new();
                for i in images_result {
                    if !i.id.is_empty() {
                        map.insert(i.id.clone(), i);
                    }
                }
                map
            },
            volumes: {
                let mut map: HashMap<String, Volume> = HashMap::new();
                for v in volumes_result {
                    if !v.name.is_empty() {
                        map.insert(v.name.clone(), v);
                    }
                }
                map
            },
            networks: {
                let mut map: HashMap<String, Network> = HashMap::new();
                for n in networks_result {
                    if !n.name.is_empty() {
                        map.insert(n.name.clone(), n);
                    }
                }
                map
            },
            engine_status: engine.engine_status.clone(),
            docker_info: None, // TODO: Implement in follow-up
            version: 0,        // Assigned when the snapshot is published
            last_updated: chrono::Utc::now(),
        };

        Ok(engine_state)
    }

    /// Helper function to fetch containers
    async fn fetch_containers(
        docker: &Docker,
    ) -> Result<Vec<bollard::models::ContainerSummary>, String> {
        use crate::services::ContainersService;
        ContainersService::get_containers(docker).await
    }

    /// Helper function to fetch images
    async fn fetch_images(docker: &Docker) -> Result<Vec<crate::entities::Image>, String> {
        use crate::services::ImagesService;
        ImagesService::get_images(docker).await
    }

    /// Helper function to fetch volumes
    async fn fetch_volumes(docker: &Docker) -> Result<Vec<crate::entities::Volume>, String> {
        use crate::services::VolumesService;
        VolumesService::get_volumes(docker).await
    }

    /// Helper function to fetch networks
    async fn fetch_networks(docker: &Docker) -> Result<Vec<crate::entities::Network>, String> {
        use crate::services::NetworksService;
        NetworksService::get_networks(docker).await
    }
}
