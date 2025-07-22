use crate::entities::Container;
use crate::services::ContainersService;

#[tauri::command]
pub async fn list_containers() -> Vec<Container> {
    println!("Listing containers");

    let containers = ContainersService::get_containers().await;

    containers.into_iter().map(|c| c.into()).collect()
}

#[tauri::command]
pub async fn start_container(id: String) -> Result<(), String> {
    println!("Starting container: {}", id);

    ContainersService::start_container(&id).await
}

#[tauri::command]
pub async fn stop_container(id: String) -> Result<(), String> {
    println!("Stopping container: {}", id);

    ContainersService::stop_container(&id).await
}

#[tauri::command]
pub async fn pause_container(id: String) -> Result<(), String> {
    println!("Pausing container: {}", id);

    ContainersService::pause_container(&id).await
}

#[tauri::command]
pub async fn unpause_container(id: String) -> Result<(), String> {
    println!("Unpausing container: {}", id);

    ContainersService::unpause_container(&id).await
}

#[tauri::command]
pub async fn restart_container(id: String) -> Result<(), String> {
    println!("Restarting container: {}", id);

    ContainersService::restart_container(&id).await
}

#[tauri::command]
pub async fn bulk_start_containers(ids: Vec<String>) -> Result<(), String> {
    println!("Starting {} containers", ids.len());

    for id in &ids {
        if let Err(e) = ContainersService::start_container(id).await {
            return Err(format!("Failed to start container {}: {}", id, e));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn bulk_stop_containers(ids: Vec<String>) -> Result<(), String> {
    println!("Stopping {} containers", ids.len());

    for id in &ids {
        if let Err(e) = ContainersService::stop_container(id).await {
            return Err(format!("Failed to stop container {}: {}", id, e));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn bulk_pause_containers(ids: Vec<String>) -> Result<(), String> {
    println!("Pausing {} containers", ids.len());

    for id in &ids {
        if let Err(e) = ContainersService::pause_container(id).await {
            return Err(format!("Failed to pause container {}: {}", id, e));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn bulk_unpause_containers(ids: Vec<String>) -> Result<(), String> {
    println!("Unpausing {} containers", ids.len());

    for id in &ids {
        if let Err(e) = ContainersService::unpause_container(id).await {
            return Err(format!("Failed to unpause container {}: {}", id, e));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn bulk_restart_containers(ids: Vec<String>) -> Result<(), String> {
    println!("Restarting {} containers", ids.len());

    for id in &ids {
        if let Err(e) = ContainersService::restart_container(id).await {
            return Err(format!("Failed to restart container {}: {}", id, e));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn bulk_remove_containers(ids: Vec<String>) -> Result<(), String> {
    println!("Removing {} containers", ids.len());

    for id in &ids {
        if let Err(e) = ContainersService::remove_container(id).await {
            return Err(format!("Failed to remove container {}: {}", id, e));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn open_terminal(id: String) -> Result<(), String> {
    println!("Opening terminal: {}", id);

    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    // ContainersService::open_terminal(id).await;

    Ok(())
}

#[tauri::command]
pub async fn container_logs(id: String) -> Result<(), String> {
    println!("Getting container logs: {}", id);

    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    // ContainersService::container_logs(id).await;

    Ok(())
}

#[tauri::command]
pub async fn container_files(id: String) -> Result<(), String> {
    println!("Getting container files: {}", id);

    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    // ContainersService::container_files(id).await;

    Ok(())
}

#[tauri::command]
pub async fn remove_container(id: String) -> Result<(), String> {
    println!("Removing container: {}", id);

    ContainersService::remove_container(&id).await
}

#[tauri::command]
pub async fn force_remove_container(id: String) -> Result<(), String> {
    println!("Force removing container: {}", id);

    ContainersService::force_remove_container(&id).await
}
