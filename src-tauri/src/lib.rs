mod entities;
mod handlers;
mod services;
mod state;

use crate::handlers::{
    bulk_force_remove_containers,
    bulk_pause_containers,
    bulk_remove_containers,
    bulk_remove_networks,
    bulk_remove_volumes,
    bulk_restart_containers,
    bulk_start_containers,
    bulk_stop_containers,
    bulk_unpause_containers,
    check_colima_availability,
    check_homebrew_availability,
    container_files,
    container_logs,
    delete_image,
    engine_status,
    force_remove_container,
    // Configuration
    get_config,
    get_docker_info,
    get_engine_state,
    get_language,
    get_theme,
    inspect_volume,
    install_colima_command,
    // Containers
    list_containers,
    // Images
    list_images,
    // Networks
    list_networks,
    // Volumes
    list_volumes,
    // Setup
    mark_frontend_ready,
    open_terminal,
    // System
    open_url,
    pause_container,
    prune_containers,
    prune_images,
    prune_volumes,
    remove_container,
    remove_network,
    remove_volume,
    restart_container,
    start_colima_vm_command,
    start_container,
    start_engine_state_monitoring,
    stop_container,
    unpause_container,
    update_language,
    update_last_update_check,
    update_sidebar_collapsed,
    update_startup_settings,
    update_telemetry_settings,
    update_theme,
};
use crate::state::SharedEngineState;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // Setup
            mark_frontend_ready,
            // Configuration
            get_config,
            get_docker_info,
            get_engine_state,
            get_language,
            get_theme,
            update_language,
            update_theme,
            update_startup_settings,
            update_telemetry_settings,
            update_last_update_check,
            update_sidebar_collapsed,
            // Containers
            list_containers,
            start_container,
            stop_container,
            restart_container,
            pause_container,
            unpause_container,
            remove_container,
            force_remove_container,
            bulk_start_containers,
            bulk_stop_containers,
            bulk_restart_containers,
            bulk_pause_containers,
            bulk_unpause_containers,
            bulk_remove_containers,
            bulk_force_remove_containers,
            container_logs,
            container_files,
            open_terminal,
            prune_containers,
            // Images
            list_images,
            delete_image,
            prune_images,
            // Networks
            list_networks,
            remove_network,
            bulk_remove_networks,
            // Volumes
            list_volumes,
            inspect_volume,
            remove_volume,
            bulk_remove_volumes,
            prune_volumes,
            // Engine
            engine_status,
            start_engine_state_monitoring,
            // System
            open_url,
            check_homebrew_availability,
            check_colima_availability,
            install_colima_command,
            start_colima_vm_command,
        ])
        .setup(|app| {
            let engine_state = SharedEngineState::new(app.app_handle().clone());
            app.manage(engine_state);

            Ok(())
        })
        .on_window_event(|window, event| {
            // Only handle events for the main window
            if window.label() != "main" {
                return;
            }

            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if let Some(window) = window.get_webview_window("main") {
                    window.hide().unwrap();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
