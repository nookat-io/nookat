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
pub async fn bulk_force_remove_containers(ids: Vec<String>) -> Result<(), String> {
    println!("Force removing {} containers", ids.len());

    for id in &ids {
        if let Err(e) = ContainersService::force_remove_container(id).await {
            return Err(format!("Failed to force remove container {}: {}", id, e));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn open_terminal(id: String) -> Result<(), String> {
    println!("Opening terminal: {}", id);

    ContainersService::open_terminal(&id).await
}

#[tauri::command]
pub async fn container_logs(
    id: String,
    lines: Option<u32>,
    since: Option<String>,
    until: Option<String>,
    follow: Option<bool>
) -> Result<Vec<String>, String> {
    println!("Getting container logs: {} (lines: {:?}, since: {:?}, until: {:?}, follow: {:?})", 
             id, lines, since, until, follow);

    // Mock logs for now - replace with actual Docker API call
    // In a real implementation, you would query the container state and get appropriate logs
    let mock_logs = vec![
        "2024-01-15T10:30:00Z Container started successfully".to_string(),
        "2024-01-15T10:30:01Z Database connection established".to_string(),
        "2024-01-15T10:30:02Z Warning: High memory usage detected".to_string(),
        "2024-01-15T10:30:03Z Error: Failed to connect to external service".to_string(),
        "2024-01-15T10:30:04Z Application ready on port 8080".to_string(),
        "2024-01-15T10:35:00Z Container stopped gracefully".to_string(),
    ];

    // Apply filters based on parameters
    let mut filtered_logs = mock_logs;
    
    if let Some(line_count) = lines {
        if line_count < filtered_logs.len() as u32 {
            filtered_logs = filtered_logs.into_iter().rev().take(line_count as usize).collect();
            filtered_logs.reverse();
        }
    }

    Ok(filtered_logs)
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
