use crate::entities::{Image, PruneResult};
use crate::services::ImagesService;

#[tauri::command]
pub async fn list_images() -> Result<Vec<Image>, String> {
    println!("Listing images");
    ImagesService::get_images().await
}

#[tauri::command]
pub async fn prune_images() -> Result<PruneResult, String> {
    println!("Pruning unused images");
    ImagesService::perform_prune().await
}
