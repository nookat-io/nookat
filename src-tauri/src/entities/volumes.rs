use bollard::models::Volume;
use bollard::volume::ListVolumesOptions;

use bollard::Docker;

async fn get_volumes() -> Vec<Volume> {
    let docker = Docker::connect_with_local_defaults().unwrap();

    let options: ListVolumesOptions<String> = ListVolumesOptions::default();

    return docker
        .list_volumes(Some(options))
        .await
        .expect("Failed to list volumes")
        .volumes
        .unwrap_or_default();
}

#[tauri::command]
pub async fn list_volumes() -> Vec<Volume> {
    println!("Listing volumes");

    let volumes = get_volumes().await;
    return volumes;
}
