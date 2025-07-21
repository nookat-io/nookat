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

    // Emulate container starting process by waiting 1 second
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    // ContainersService::start_container(id).await;

    Ok(())
}

#[tauri::command]
pub async fn stop_container(id: String) -> Result<(), String> {
    println!("Stopping container: {}", id);

    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    // ContainersService::stop_container(id).await;

    Ok(())
}

#[tauri::command]
pub async fn restart_container(id: String) -> Result<(), String> {
    println!("Restarting container: {}", id);

    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    // ContainersService::restart_container(id).await;

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

    let _ = ContainersService::remove_container(id).await;

    Ok(())
}
