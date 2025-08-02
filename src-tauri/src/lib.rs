mod entities;
mod handlers;
mod services;
mod state;

use crate::handlers::{
    bulk_force_remove_containers, bulk_pause_containers, bulk_remove_containers,
    bulk_remove_networks, bulk_remove_volumes, bulk_restart_containers, bulk_start_containers,
    bulk_stop_containers, bulk_unpause_containers, container_files, container_logs,
    force_remove_container, get_docker_info, inspect_volume, list_containers, list_images,
    list_networks, list_volumes, open_terminal, open_url, pause_container, prune_containers,
    prune_images, prune_volumes, remove_container, remove_network, remove_volume,
    restart_container, start_container, stop_container, unpause_container,
};
use crate::state::SharedDockerState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(SharedDockerState::new())
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
            bulk_force_remove_containers,
            open_terminal,
            container_logs,
            container_files,
            remove_container,
            force_remove_container,
            prune_containers,
            // Images
            list_images,
            prune_images,
            // Networks
            list_networks,
            remove_network,
            bulk_remove_networks,
            // Volumes
            list_volumes,
            remove_volume,
            bulk_remove_volumes,
            inspect_volume,
            prune_volumes,
            // System
            open_url,
            get_docker_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
