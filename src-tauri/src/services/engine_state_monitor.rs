use crate::entities::EngineState;
use crate::services::websocket::WebSocketManager;
use crate::state::SharedEngineState;
use bollard::system::EventsOptions;
use bollard::Docker;
use futures_util::StreamExt;
use serde_json;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tracing::{debug, error, info, warn};

pub struct EngineStateMonitor {
    websocket_manager: Arc<WebSocketManager>,
    state: Arc<SharedEngineState>,
    is_monitoring: Arc<Mutex<bool>>,
}

impl EngineStateMonitor {
    pub fn new(websocket_manager: Arc<WebSocketManager>, state: Arc<SharedEngineState>) -> Self {
        Self {
            websocket_manager,
            state,
            is_monitoring: Arc::new(Mutex::new(false)),
        }
    }

    /// Start monitoring Docker events and broadcasting state changes
    pub async fn start_monitoring(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut is_monitoring = self.is_monitoring.lock().await;

        if *is_monitoring {
            info!("Engine state monitoring already running");
            return Ok(());
        }

        *is_monitoring = true;
        drop(is_monitoring);

        let websocket_manager = self.websocket_manager.clone();
        let state = self.state.clone();
        let is_monitoring = self.is_monitoring.clone();

        tokio::spawn(async move {
            if let Err(e) = Self::monitor_loop(websocket_manager, state, is_monitoring).await {
                error!("Engine state monitoring error: {}", e);
            }
        });

        info!("Engine state monitoring started");
        Ok(())
    }

    /// Stop monitoring Docker events
    pub async fn stop_monitoring(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut is_monitoring = self.is_monitoring.lock().await;
        *is_monitoring = false;
        info!("Engine state monitoring stopped");
        Ok(())
    }

    /// Main monitoring loop that watches Docker events
    async fn monitor_loop(
        websocket_manager: Arc<WebSocketManager>,
        state: Arc<SharedEngineState>,
        is_monitoring: Arc<Mutex<bool>>,
    ) -> Result<(), Box<dyn std::error::Error>> {
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
                Ok(engine) =>
                    if let Some(docker) = &engine.docker {
                        if let Err(e) =
                            Self::monitor_docker_events(docker, &websocket_manager, &state).await
                        {
                            warn!("Docker events monitoring error: {}", e);
                        }
                    },
                Err(e) => {
                    debug!("Engine not available for monitoring: {}", e);
                }
            }

            // Wait before retrying
            tokio::time::sleep(Duration::from_secs(5)).await;
        }

        Ok(())
    }

    /// Monitor Docker events and broadcast state changes
    async fn monitor_docker_events(
        docker: &Docker,
        websocket_manager: &Arc<WebSocketManager>,
        state: &Arc<SharedEngineState>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let options = EventsOptions::<String> {
            since: None,
            until: None,
            filters: std::collections::HashMap::new(),
        };

        let mut events = docker.events(Some(options));

        while let Some(event_result) = events.next().await {
            match event_result {
                Ok(event) => {
                    debug!("Docker event received: {:?}", event);

                    // Broadcast updated engine state
                    if let Err(e) = Self::broadcast_updated_state(websocket_manager, state).await {
                        error!("Failed to broadcast updated state: {}", e);
                    }
                }
                Err(e) => {
                    warn!("Error reading Docker event: {}", e);
                    break;
                }
            }
        }

        Ok(())
    }

    /// Broadcast the current engine state to all WebSocket clients
    async fn broadcast_updated_state(
        websocket_manager: &Arc<WebSocketManager>,
        state: &Arc<SharedEngineState>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Get the current engine state
        let engine_state = match state.get_engine().await {
            Ok(engine) => {
                if let Some(docker) = &engine.docker {
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
                        last_prune_results: std::collections::HashMap::new(), // TODO: Implement in follow-up
                        version: 1, // TODO: Implement versioning in follow-up
                        last_updated: chrono::Utc::now(),
                    };

                    engine_state
                } else {
                    return Ok(());
                }
            }
            Err(_) => return Ok(()),
        };

        // Convert to JSON and broadcast
        let engine_state_json = serde_json::to_value(engine_state)?;
        websocket_manager
            .broadcast_engine_state_update(engine_state_json)
            .await?;

        Ok(())
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
