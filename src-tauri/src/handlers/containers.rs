use crate::entities::Container;
use crate::services::ContainersService;
use crate::state::SharedDockerState;
use tauri::State;

#[tauri::command]
pub async fn list_containers(
    state: State<'_, SharedDockerState>,
) -> Result<Vec<Container>, String> {
    println!("Listing containers");

    let docker = state.get_docker().await?;
    let containers = ContainersService::get_containers(&docker).await?;
    state.return_docker(docker).await;

    Ok(containers.into_iter().map(|c| c.into()).collect())
}

#[tauri::command]
pub async fn start_container(
    state: State<'_, SharedDockerState>,
    id: String,
) -> Result<(), String> {
    println!("Starting container: {}", id);

    let docker = state.get_docker().await?;
    let result = ContainersService::start_container(&docker, &id).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn stop_container(
    state: State<'_, SharedDockerState>,
    id: String,
) -> Result<(), String> {
    println!("Stopping container: {}", id);

    let docker = state.get_docker().await?;
    let result = ContainersService::stop_container(&docker, &id).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn pause_container(
    state: State<'_, SharedDockerState>,
    id: String,
) -> Result<(), String> {
    println!("Pausing container: {}", id);

    let docker = state.get_docker().await?;
    let result = ContainersService::pause_container(&docker, &id).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn unpause_container(
    state: State<'_, SharedDockerState>,
    id: String,
) -> Result<(), String> {
    println!("Unpausing container: {}", id);

    let docker = state.get_docker().await?;
    let result = ContainersService::unpause_container(&docker, &id).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn restart_container(
    state: State<'_, SharedDockerState>,
    id: String,
) -> Result<(), String> {
    println!("Restarting container: {}", id);

    let docker = state.get_docker().await?;
    let result = ContainersService::restart_container(&docker, &id).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn bulk_start_containers(
    state: State<'_, SharedDockerState>,
    ids: Vec<String>,
) -> Result<(), String> {
    println!("Starting {} containers", ids.len());

    let docker = state.get_docker().await?;
    for id in &ids {
        if let Err(e) = ContainersService::start_container(&docker, id).await {
            state.return_docker(docker).await;
            return Err(format!("Failed to start container {}: {}", id, e));
        }
    }
    state.return_docker(docker).await;
    Ok(())
}

#[tauri::command]
pub async fn bulk_stop_containers(
    state: State<'_, SharedDockerState>,
    ids: Vec<String>,
) -> Result<(), String> {
    println!("Stopping {} containers", ids.len());

    let docker = state.get_docker().await?;
    for id in &ids {
        if let Err(e) = ContainersService::stop_container(&docker, id).await {
            state.return_docker(docker).await;
            return Err(format!("Failed to stop container {}: {}", id, e));
        }
    }
    state.return_docker(docker).await;
    Ok(())
}

#[tauri::command]
pub async fn bulk_pause_containers(
    state: State<'_, SharedDockerState>,
    ids: Vec<String>,
) -> Result<(), String> {
    println!("Pausing {} containers", ids.len());

    let docker = state.get_docker().await?;
    for id in &ids {
        if let Err(e) = ContainersService::pause_container(&docker, id).await {
            state.return_docker(docker).await;
            return Err(format!("Failed to pause container {}: {}", id, e));
        }
    }
    state.return_docker(docker).await;
    Ok(())
}

#[tauri::command]
pub async fn bulk_unpause_containers(
    state: State<'_, SharedDockerState>,
    ids: Vec<String>,
) -> Result<(), String> {
    println!("Unpausing {} containers", ids.len());

    let docker = state.get_docker().await?;
    for id in &ids {
        if let Err(e) = ContainersService::unpause_container(&docker, id).await {
            state.return_docker(docker).await;
            return Err(format!("Failed to unpause container {}: {}", id, e));
        }
    }
    state.return_docker(docker).await;
    Ok(())
}

#[tauri::command]
pub async fn bulk_restart_containers(
    state: State<'_, SharedDockerState>,
    ids: Vec<String>,
) -> Result<(), String> {
    println!("Restarting {} containers", ids.len());

    let docker = state.get_docker().await?;
    for id in &ids {
        if let Err(e) = ContainersService::restart_container(&docker, id).await {
            state.return_docker(docker).await;
            return Err(format!("Failed to restart container {}: {}", id, e));
        }
    }
    state.return_docker(docker).await;
    Ok(())
}

#[tauri::command]
pub async fn bulk_remove_containers(
    state: State<'_, SharedDockerState>,
    ids: Vec<String>,
) -> Result<(), String> {
    println!("Removing {} containers", ids.len());

    let docker = state.get_docker().await?;
    for id in &ids {
        if let Err(e) = ContainersService::remove_container(&docker, id).await {
            state.return_docker(docker).await;
            return Err(format!("Failed to remove container {}: {}", id, e));
        }
    }
    state.return_docker(docker).await;
    Ok(())
}

#[tauri::command]
pub async fn bulk_force_remove_containers(
    state: State<'_, SharedDockerState>,
    ids: Vec<String>,
) -> Result<(), String> {
    println!("Force removing {} containers", ids.len());

    let docker = state.get_docker().await?;
    for id in &ids {
        if let Err(e) = ContainersService::force_remove_container(&docker, id).await {
            state.return_docker(docker).await;
            return Err(format!("Failed to force remove container {}: {}", id, e));
        }
    }
    state.return_docker(docker).await;
    Ok(())
}

#[tauri::command]
pub async fn open_terminal(
    state: State<'_, SharedDockerState>,
    id: String,
) -> Result<(), String> {
    println!("Opening terminal for container: {}", id);

    let docker = state.get_docker().await?;
    let result = ContainersService::open_terminal(&docker, &id).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn container_logs(
    state: State<'_, SharedDockerState>,
    id: String,
) -> Result<Vec<String>, String> {
    println!("Getting logs for container: {}", id);

    let docker = state.get_docker().await?;
    let result = ContainersService::get_container_logs(&docker, &id).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn container_files(
    _state: State<'_, SharedDockerState>,
    id: String,
) -> Result<(), String> {
    println!("Opening files for container: {}", id);
    // TODO: Implement container files functionality
    Ok(())
}

#[tauri::command]
pub async fn remove_container(
    state: State<'_, SharedDockerState>,
    id: String,
) -> Result<(), String> {
    println!("Removing container: {}", id);

    let docker = state.get_docker().await?;
    let result = ContainersService::remove_container(&docker, &id).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn force_remove_container(
    state: State<'_, SharedDockerState>,
    id: String,
) -> Result<(), String> {
    println!("Force removing container: {}", id);

    let docker = state.get_docker().await?;
    let result = ContainersService::force_remove_container(&docker, &id).await;
    state.return_docker(docker).await;
    result
}

#[tauri::command]
pub async fn prune_containers(state: State<'_, SharedDockerState>) -> Result<(), String> {
    println!("Pruning containers");

    let docker = state.get_docker().await?;
    let result = ContainersService::prune_containers(&docker).await;
    state.return_docker(docker).await;
    result
}
