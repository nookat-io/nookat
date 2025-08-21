use crate::entities::Container;
use crate::services::{shell, ContainersService};
use crate::state::SharedEngineState;
use tauri::State;
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn list_containers(
    state: State<'_, SharedEngineState>,
) -> Result<Vec<Container>, String> {
    debug!("Listing containers");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let containers = ContainersService::get_containers(docker).await?;

    Ok(containers.into_iter().map(|c| c.into()).collect())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Starting container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::start_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn stop_container(state: State<'_, SharedEngineState>, id: String) -> Result<(), String> {
    debug!("Stopping container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::stop_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn pause_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Pausing container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::pause_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn unpause_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Unpausing container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::unpause_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn restart_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Restarting container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::restart_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_start_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<(), String> {
    debug!("Starting {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    for id in &ids {
        if let Err(e) = ContainersService::start_container(docker, id).await {
            return Err(format!("Failed to start container {}: {}", id, e));
        }
    }
    Ok(())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_stop_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<(), String> {
    debug!("Stopping {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    for id in &ids {
        if let Err(e) = ContainersService::stop_container(docker, id).await {
            return Err(format!("Failed to stop container {}: {}", id, e));
        }
    }
    Ok(())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_pause_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<(), String> {
    debug!("Pausing {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    for id in &ids {
        if let Err(e) = ContainersService::pause_container(docker, id).await {
            return Err(format!("Failed to pause container {}: {}", id, e));
        }
    }
    Ok(())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_unpause_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<(), String> {
    debug!("Unpausing {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    for id in &ids {
        if let Err(e) = ContainersService::unpause_container(docker, id).await {
            return Err(format!("Failed to unpause container {}: {}", id, e));
        }
    }
    Ok(())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_restart_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<(), String> {
    debug!("Restarting {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    for id in &ids {
        if let Err(e) = ContainersService::restart_container(docker, id).await {
            return Err(format!("Failed to restart container {}: {}", id, e));
        }
    }
    Ok(())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_remove_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<(), String> {
    debug!("Removing {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    for id in &ids {
        if let Err(e) = ContainersService::remove_container(docker, id).await {
            return Err(format!("Failed to remove container {}: {}", id, e));
        }
    }
    Ok(())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_force_remove_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<(), String> {
    debug!("Force removing {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    for id in &ids {
        if let Err(e) = ContainersService::force_remove_container(docker, id).await {
            return Err(format!("Failed to force remove container {}: {}", id, e));
        }
    }
    Ok(())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn open_terminal(
    app: tauri::AppHandle,
    state: State<'_, SharedEngineState>,
    id: String
) -> Result<(), String> {
    debug!("Opening terminal for container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;

    // Check if container is running
    let container_running = ContainersService::is_container_running(docker, &id).await?;

    if !container_running {
        return Err("Container is not running".to_string());
    }

    shell::open_container_terminal(&app, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn container_logs(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<Vec<String>, String> {
    debug!("Getting logs for container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::get_container_logs(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn container_files(
    _state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Opening files for container: {}", id);
    // TODO: Implement container files functionality
    Err("Container files functionality is not implemented yet".to_string())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn remove_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Removing container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::remove_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn force_remove_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Force removing container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::force_remove_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn prune_containers(state: State<'_, SharedEngineState>) -> Result<(), String> {
    debug!("Pruning containers");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::prune_containers(docker).await
}
