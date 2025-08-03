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
use tauri::{App, Manager, image::Image, menu::{MenuBuilder, MenuItem}, tray::TrayIconBuilder, ActivationPolicy};


fn build_tray(app: &mut App) -> Result<(), String> {
    // Build the tray menu
    let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>).unwrap();
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>).unwrap();
    let menu = MenuBuilder::new(app)
        .item(&show_item)
        .item(&quit_item)
        .build()
        .unwrap();

    let icon_bytes = include_bytes!("../icons/icon_512x512.png");
    let icon_image = image::load_from_memory(icon_bytes).expect("Failed to load icon");
    let rgba = icon_image.to_rgba8();
    let (width, height) = rgba.dimensions();

    let _tray_icon = TrayIconBuilder::with_id("tray")
        .icon(Image::new(rgba.as_raw(), width, height))
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)
        .unwrap();
    Ok(())
}


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut app = tauri::Builder::default()
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
        .setup(|app| {
            Ok(build_tray(app)?)
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            // There is no Minimized event in Tauri v2, so we can't handle minimize directly.
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
