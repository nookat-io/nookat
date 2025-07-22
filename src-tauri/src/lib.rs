mod entities;
mod handlers;
mod services;

use crate::entities::list_images;
use crate::entities::list_networks;
use crate::entities::list_volumes;
use crate::handlers::{
    container_files, container_logs, list_containers, open_terminal, remove_container,
    restart_container, start_container, stop_container, pause_container, unpause_container,
    force_remove_container, bulk_start_containers, bulk_stop_containers, bulk_pause_containers,
    bulk_unpause_containers, bulk_restart_containers, bulk_remove_containers,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Containers
            list_containers,
            start_container,
            stop_container,
            pause_container,
            unpause_container,
            restart_container,
            bulk_start_containers,
            bulk_stop_containers,
            bulk_pause_containers,
            bulk_unpause_containers,
            bulk_restart_containers,
            bulk_remove_containers,
            open_terminal,
            container_logs,
            container_files,
            remove_container,
            force_remove_container,
            // Images
            list_images,
            list_networks,
            list_volumes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
