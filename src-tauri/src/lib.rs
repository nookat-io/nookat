mod entities;
mod handlers;
pub mod sentry;
mod services;
mod state;

use crate::handlers::{
    broadcast_websocket_message, bulk_force_remove_containers, bulk_pause_containers,
    bulk_remove_containers, bulk_remove_networks, bulk_remove_volumes, bulk_restart_containers,
    bulk_start_containers, bulk_stop_containers, bulk_unpause_containers,
    check_colima_availability, check_homebrew_availability, container_files, container_logs,
    delete_image, engine_status, force_remove_container, get_config, get_docker_info,
    get_engine_state, get_language, get_theme, get_websocket_status, inspect_volume,
    install_colima_command, list_containers, list_images, list_networks, list_volumes,
    open_terminal, open_url, pause_container, prune_containers, prune_images, prune_volumes,
    remove_container, remove_network, remove_volume, restart_container, start_colima_vm_command,
    start_container, start_engine_state_monitoring, start_websocket_server,
    start_websocket_timestamp_service, stop_container, unpause_container, update_language,
    update_last_update_check, update_sidebar_collapsed, update_startup_settings,
    update_telemetry_settings, update_theme,
};
use crate::sentry::flush_sentry;
use crate::services::ConfigService;
use crate::state::SharedEngineState;
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItem},
    tray::TrayIconBuilder,
    App, Manager,
};
use tracing::{error, instrument};

#[instrument(skip_all)]
fn build_tray(app: &mut App) -> Result<(), String> {
    // Build the tray menu
    let show_item = MenuItem::with_id(app, "open", "Open", true, None::<&str>)
        .map_err(|e| format!("Failed to create show menu item: {}", e))?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)
        .map_err(|e| format!("Failed to create quit menu item: {}", e))?;

    let menu = MenuBuilder::new(app)
        .item(&show_item)
        .item(&quit_item)
        .build()
        .map_err(|e| format!("Failed to build tray menu: {}", e))?;

    let icon_bytes = include_bytes!("../icons/icon_512x512.png");
    let icon_image =
        image::load_from_memory(icon_bytes).map_err(|e| format!("Failed to load icon: {}", e))?;
    let rgba = icon_image.to_rgba8();
    let (width, height) = rgba.dimensions();

    let _tray_icon = TrayIconBuilder::with_id("tray")
        .icon(Image::new(rgba.as_raw(), width, height))
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => {
                // Try to find the main window by getting the first available window
                // or by trying common default window IDs
                let window = app
                    .get_webview_window("main")
                    .or_else(|| app.get_webview_window("primary"))
                    .or_else(|| app.get_webview_window("default"))
                    .or_else(|| {
                        // If no specific window found, try to get any available window
                        app.webview_windows().values().next().cloned()
                    });

                if let Some(window) = window {
                    if let Err(e) = window.show() {
                        error!("Failed to show window: {}", e);
                    }
                    if let Err(e) = window.set_focus() {
                        error!("Failed to focus window: {}", e);
                    }
                } else {
                    error!("No main window found to show");
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)
        .map_err(|e| format!("Failed to build tray icon: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            // Configuration
            get_config,
            get_theme,
            update_theme,
            get_language,
            update_language,
            update_telemetry_settings,
            update_startup_settings,
            update_sidebar_collapsed,
            update_last_update_check,
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
            delete_image,
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
            get_docker_info,
            engine_status,
            get_engine_state,
            check_homebrew_availability,
            check_colima_availability,
            install_colima_command,
            start_colima_vm_command,
            start_websocket_server,
            broadcast_websocket_message,
            start_websocket_timestamp_service,
            get_websocket_status,
            start_engine_state_monitoring,
        ])
        .setup(|app| {
            let engine_state = SharedEngineState::new(app.app_handle().clone());
            app.manage(engine_state);
            Ok(build_tray(app)?)
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if let Ok(config) = ConfigService::get_config() {
                    if config.startup.minimize_to_tray {
                        if let Err(e) = window.hide() {
                            error!("Failed to hide window: {}", e);
                            window.app_handle().exit(0);
                        }
                        api.prevent_close();
                    } else {
                        window.app_handle().exit(0);
                    }
                } else {
                    window.app_handle().exit(0);
                }
            }
            // There is no Minimized event in Tauri v2, so we can't handle minimize directly.
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    // Flush Sentry events before shutdown
    flush_sentry();
}
