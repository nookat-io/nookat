mod entities;
mod handlers;
pub mod sentry;
mod services;
mod state;

use crate::handlers::{
    bulk_force_remove_containers, bulk_pause_containers, bulk_remove_containers,
    bulk_remove_networks, bulk_remove_volumes, bulk_restart_containers, bulk_start_containers,
    bulk_stop_containers, bulk_unpause_containers, check_colima_availability,
    check_homebrew_availability, container_files, container_logs, delete_image, engine_status,
    fetch_image_tags, force_remove_container, get_config, get_docker_info, get_engine_state,
    get_language, get_theme, inspect_volume, install_colima_command, is_colima_supported,
    list_containers, list_images, list_networks, list_volumes, open_terminal, open_url,
    pause_container, prune_containers, prune_images, prune_volumes, pull_image, remove_container,
    remove_network, remove_volume, restart_container, search_docker_hub, start_colima_vm_command,
    start_container, start_engine_state_monitoring, stop_colima_vm_command, stop_container,
    unpause_container, update_language, update_last_update_check, update_sidebar_collapsed,
    update_startup_settings, update_telemetry_settings, update_theme,
};
use crate::sentry::flush_sentry;
use crate::services::ConfigService;
use crate::state::SharedEngineState;
use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItem},
    tray::TrayIconBuilder,
    App, AppHandle, Manager, RunEvent, Window, WindowEvent,
};
use tracing::instrument;

const MAIN_WINDOW_LABEL: &str = "main";

#[instrument(skip_all, err)]
fn show_main_window(app: &AppHandle) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    app.set_activation_policy(tauri::ActivationPolicy::Regular)?;
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or(tauri::Error::WindowNotFound)?;
    window.unminimize()?;
    window.show()?;
    window.set_focus()
}

#[instrument(skip_all, err)]
fn hide_to_tray(window: &Window) -> tauri::Result<()> {
    window.hide()?;
    #[cfg(target_os = "macos")]
    window
        .app_handle()
        .set_activation_policy(tauri::ActivationPolicy::Accessory)?;
    Ok(())
}

fn closes_to_tray() -> bool {
    ConfigService::get_config().is_ok_and(|config| config.startup.minimize_to_tray)
}

#[cfg(target_os = "macos")]
fn on_run_event(app: &AppHandle, event: RunEvent) {
    if let RunEvent::Reopen { .. } = event {
        let _ = show_main_window(app);
    }
}

#[cfg(not(target_os = "macos"))]
fn on_run_event(_app: &AppHandle, _event: RunEvent) {}

#[instrument(skip_all)]
fn build_tray(app: &mut App) -> Result<(), String> {
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
                let _ = show_main_window(app);
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
            get_config,
            get_theme,
            update_theme,
            get_language,
            update_language,
            update_telemetry_settings,
            update_startup_settings,
            update_sidebar_collapsed,
            update_last_update_check,
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
            list_images,
            prune_images,
            delete_image,
            pull_image,
            search_docker_hub,
            fetch_image_tags,
            list_networks,
            remove_network,
            bulk_remove_networks,
            list_volumes,
            remove_volume,
            bulk_remove_volumes,
            inspect_volume,
            prune_volumes,
            open_url,
            get_docker_info,
            engine_status,
            get_engine_state,
            start_engine_state_monitoring,
            check_homebrew_availability,
            check_colima_availability,
            is_colima_supported,
            install_colima_command,
            start_colima_vm_command,
            stop_colima_vm_command,
        ])
        .setup(|app| {
            let engine_state = SharedEngineState::new(app.app_handle().clone());
            app.manage(engine_state);
            Ok(build_tray(app)?)
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if closes_to_tray() && hide_to_tray(window).is_ok() {
                    api.prevent_close();
                } else {
                    window.app_handle().exit(0);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(on_run_event);

    // Flush Sentry events before shutdown
    flush_sentry();
}
