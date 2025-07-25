// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use nookat_lib::{
    container_files, container_logs, list_containers, list_images, list_networks, list_volumes,
    open_terminal, remove_container, restart_container, start_container, stop_container,
    pause_container, unpause_container, force_remove_container, bulk_start_containers,
    bulk_stop_containers, bulk_pause_containers, bulk_unpause_containers, bulk_restart_containers,
    bulk_remove_containers, bulk_force_remove_containers, prune_containers,
};

fn main() {
    // Initialize logging - in debug mode, log to stdout; in release, log to file
    #[cfg(debug_assertions)]
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info")).init();
    
    #[cfg(not(debug_assertions))]
    {
        use std::fs;
        if let Ok(app_dir) = tauri::api::path::app_data_dir(&tauri::Config::default()) {
            let log_dir = app_dir.join("logs");
            let _ = fs::create_dir_all(&log_dir);
            let log_file = log_dir.join("nookat.log");
            
            if let Ok(file) = fs::OpenOptions::new()
                .create(true)
                .append(true)
                .open(log_file) {
                env_logger::Builder::new()
                    .target(env_logger::Target::Pipe(Box::new(file)))
                    .filter_level(log::LevelFilter::Info)
                    .init();
            } else {
                env_logger::init();
            }
        } else {
            env_logger::init();
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Container operations
            list_containers,
            start_container,
            stop_container,
            restart_container,
            remove_container,
            pause_container,
            unpause_container,
            force_remove_container,
            container_logs,
            container_files,
            open_terminal,
            
            // Bulk operations
            bulk_start_containers,
            bulk_stop_containers,
            bulk_pause_containers,
            bulk_unpause_containers,
            bulk_restart_containers,
            bulk_remove_containers,
            bulk_force_remove_containers,
            prune_containers,
            
            // Other resources
            list_images,
            list_networks,
            list_volumes
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
