// use crate::services::VolumesService;
use crate::entities::Volume;

#[tauri::command]
pub async fn list_volumes() -> Vec<Volume> {
    println!("Listing volumes");

    todo!()
    // let volumes = get_volumes().await;
    // return volumes;
}
