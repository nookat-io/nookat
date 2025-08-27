use crate::entities::EngineState;
use crate::state::SharedEngineState;
use bollard::system::EventsOptions;
use bollard::Docker;
use futures_util::StreamExt;
use std::sync::Arc;
use std::time::Duration;
use tauri::Emitter;
use tokio::sync::Mutex;
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

        let docker_events_task = tokio::spawn(async move {
            Self::monitor_docker_events_continuously(
                state_events,
                last_state_events,
                is_monitoring_events,
                app_handle_events,
            )
            .await
        });

        // Main polling loop for periodic state checks
        let mut interval = tokio::time::interval(Duration::from_secs(5));

        loop {
            interval.tick().await;

            // Check if we should stop monitoring
            {
                let monitoring = is_monitoring.lock().await;
                if !*monitoring {
                    break;
                }
            }

            // Check if Docker events monitoring task has failed
            if docker_events_task.is_finished() {
                match docker_events_task.await {
                    Ok(Ok(())) => {
                        debug!("Docker events monitoring completed successfully");
                        break;
                    }
                    Ok(Err(e)) => {
                        warn!("Docker events monitoring failed: {}", e);
                        break;
                    }
                    Err(e) => {
                        error!("Docker events monitoring task panicked: {}", e);
                        break;
                    }
                };
            }

            // Try to get the engine and check for state changes
            if let Ok(engine) = state.get_engine().await {
                if let Some(docker) = &engine.docker {
                    if let Err(e) = Self::check_and_broadcast_state_changes(
                        docker,
                        &state,
                        &last_state,
                        &app_handle,
                    )
                    .await
                    {
                        warn!("State change check error: {}", e);
                    }
                }
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
        let options = EventsOptions::<String> {
            since: None,
            until: None,
            filters: std::collections::HashMap::new(),
        };

        let mut events = docker.events(Some(options));

        // Add a timeout for the first event to detect connection issues quickly
        let first_event_timeout =
            tokio::time::timeout(Duration::from_secs(10), events.next()).await;

        match first_event_timeout {
            Ok(Some(event_result)) => {
                // First event received, continue monitoring normally
                match event_result {
                    Ok(_event) => {
                        debug!("Docker event received, broadcasting state update");

                        // Broadcast updated engine state immediately on Docker events
                        if let Err(e) = Self::check_and_broadcast_state_changes(
                            docker, state, last_state, app_handle,
                        )
                        .await
                        {
                            error!("Failed to broadcast updated state: {}", e);
                        }
                    }
                    Err(e) => {
                        warn!("Error reading first Docker event: {}", e);
                        return Err(Box::new(e));
                    }
                }

                // Continue monitoring remaining events
                while let Some(event_result) = events.next().await {
                    match event_result {
                        Ok(_event) => {
                            debug!("Docker event received, broadcasting state update");

                            // Broadcast updated engine state immediately on Docker events
                            if let Err(e) = Self::check_and_broadcast_state_changes(
                                docker, state, last_state, app_handle,
                            )
                            .await
                            {
                                error!("Failed to broadcast updated state: {}", e);
                            }
                        }
                        Err(e) => {
                            warn!("Error reading Docker event: {}", e);
                            return Err(Box::new(e));
                        }
                    }
                }
            }
            Ok(None) => {
                // No events available, which is normal
                debug!("No Docker events available");
            }
            Err(_) => {
                // Timeout occurred. This can simply mean there were no events in the window.
                debug!("No Docker events received within timeout window; continuing to monitor");
            }
        }

        Ok(())
    }

    /// Check for state changes and broadcast if changes are detected
    async fn check_and_broadcast_state_changes(
        docker: &Docker,
        state: &Arc<SharedEngineState>,
        last_state: &Arc<Mutex<Option<EngineState>>>,
        app_handle: &tauri::AppHandle,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Get current state
        let current_state = Self::fetch_current_engine_state(docker, state).await?;

        // Check if state has changed
        let should_broadcast = {
            let last_state_guard = last_state.lock().await;
            if let Some(ref last) = *last_state_guard {
                Self::has_state_changed(last, &current_state)
            } else {
                // First time, always broadcast
                true
            }
        };

        if should_broadcast {
            // Update last state
            {
                let mut last_state_guard = last_state.lock().await;
                *last_state_guard = Some(current_state.clone());
            }

            // Emit Tauri event to frontend
            let engine_state_json = serde_json::to_value(&current_state)?;
            app_handle.emit("engine_state_update", &engine_state_json)?;

            debug!("Engine state updated and broadcasted via Tauri event");
        }

        Ok(())
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

    /// Fetch the current engine state from Docker
    async fn fetch_current_engine_state(
        docker: &Docker,
        state: &Arc<SharedEngineState>,
    ) -> Result<EngineState, Box<dyn std::error::Error + Send + Sync>> {
        let engine = state.get_engine().await?;

        // Fetch all Docker entities concurrently
        let (containers_result, images_result, volumes_result, networks_result) = tokio::try_join!(
            Self::fetch_containers(docker),
            Self::fetch_images(docker),
            Self::fetch_volumes(docker),
            Self::fetch_networks(docker)
        )?;

        // Convert to EngineState format
        let engine_state = EngineState {
            containers: containers_result
                .into_iter()
                .map(|c| (c.id.clone().unwrap_or_default(), c.into()))
                .collect(),
            images: images_result
                .into_iter()
                .map(|i| (i.id.clone(), i))
                .collect(),
            volumes: volumes_result
                .into_iter()
                .map(|v| (v.name.clone(), v))
                .collect(),
            networks: networks_result
                .into_iter()
                .map(|n| (n.name.clone(), n))
                .collect(),
            engine_status: engine.engine_status.clone(),
            docker_info: None, // TODO: Implement in follow-up
            version: 1,        // TODO: Implement versioning in follow-up
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
