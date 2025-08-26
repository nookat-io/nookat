use crate::entities::EngineState;
use crate::services::{ContainersService, ImagesService, NetworksService, VolumesService};
use crate::state::SharedEngineState;
use bollard::Docker;
use chrono::Utc;
use std::collections::HashMap;
use tauri::State;
use tracing::{debug, instrument};

/// Get the complete engine state including all Docker entities
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_engine_state(state: State<'_, SharedEngineState>) -> Result<EngineState, String> {
    debug!("Getting complete engine state");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;

    // Fetch all Docker entities concurrently
    let (containers_result, images_result, volumes_result, networks_result) = tokio::try_join!(
        fetch_containers(docker),
        fetch_images(docker),
        fetch_volumes(docker),
        fetch_networks(docker)
    )?;

    // Convert collections to HashMaps with appropriate keys
    let containers: HashMap<String, _> = containers_result
        .into_iter()
        .map(|c| {
            // Use container ID if available, otherwise use first name, or generate a key
            let key =
                c.id.clone()
                    .or_else(|| c.names.as_ref().and_then(|names| names.first().cloned()))
                    .unwrap_or_else(|| {
                        format!("container_{}", c.image_id.as_deref().unwrap_or("unknown"))
                    });
            (key, c)
        })
        .collect();

    let images: HashMap<String, _> = images_result
        .into_iter()
        .map(|i| (i.id.clone(), i))
        .collect();

    let volumes: HashMap<String, _> = volumes_result
        .into_iter()
        .map(|v| (v.name.clone(), v))
        .collect();

    let networks: HashMap<String, _> = networks_result
        .into_iter()
        .map(|n| (n.name.clone(), n))
        .collect();

    // Create the complete engine state
    let engine_state = EngineState {
        containers,
        images,
        volumes,
        networks,
        engine_status: engine.engine_status.clone(),
        docker_info: None, // TODO: Implement Docker info fetching in follow-up
        last_prune_results: HashMap::new(), // TODO: Implement prune results tracking in follow-up
        version: 1,        // TODO: Implement versioning in follow-up
        last_updated: Utc::now(),
    };

    debug!(
        "Engine state created with {} containers, {} images, {} volumes, {} networks",
        engine_state.containers.len(),
        engine_state.images.len(),
        engine_state.volumes.len(),
        engine_state.networks.len()
    );

    Ok(engine_state)
}

/// Helper function to fetch containers
async fn fetch_containers(docker: &Docker) -> Result<Vec<crate::entities::Container>, String> {
    let containers = ContainersService::get_containers(docker).await?;
    Ok(containers.into_iter().map(|c| c.into()).collect())
}

/// Helper function to fetch images
async fn fetch_images(docker: &Docker) -> Result<Vec<crate::entities::Image>, String> {
    ImagesService::get_images(docker).await
}

/// Helper function to fetch volumes
async fn fetch_volumes(docker: &Docker) -> Result<Vec<crate::entities::Volume>, String> {
    VolumesService::get_volumes(docker).await
}

/// Helper function to fetch networks
async fn fetch_networks(docker: &Docker) -> Result<Vec<crate::entities::Network>, String> {
    NetworksService::get_networks(docker).await
}
