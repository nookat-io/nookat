use crate::services::VolumesService;
use crate::entities::Volume;

#[tauri::command]
pub async fn list_volumes() -> Result<Vec<Volume>, String> {
    println!("Listing volumes");

    let service = VolumesService::default();
    service.get_volumes().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_volume(name: String) -> Result<(), String> {
    println!("Removing volume: {}", name);

    let service = VolumesService::default();
    service.remove_volume(&name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn bulk_remove_volumes(names: Vec<String>) -> Result<(), String> {
    println!("Removing volumes: {:?}", names);

    let service = VolumesService::default();
    service.bulk_remove_volumes(&names).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn inspect_volume(name: String) -> Result<Volume, String> {
    println!("Inspecting volume: {}", name);

    let service = VolumesService::default();
    service.inspect_volume(&name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn prune_volumes() -> Result<(), String> {
    println!("Pruning unused volumes");

    let service = VolumesService::default();
    service.prune_volumes().await.map_err(|e| e.to_string())
}
