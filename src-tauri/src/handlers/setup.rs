use crate::state::SharedEngineState;
use tauri::{Manager, State};
use tracing::debug;

#[tauri::command]
pub async fn mark_frontend_ready(state: State<'_, SharedEngineState>) -> Result<(), String> {
    debug!("Frontend ready, transitioning to main window");
    transition_to_main_window(&state).await?;
    Ok(())
}

async fn transition_to_main_window(state: &SharedEngineState) -> Result<(), String> {
    let app_handle = &state.app_handle;

    // Show and focus the main window
    if let Some(main_window) = app_handle.get_webview_window("main") {
        main_window
            .show()
            .map_err(|e| format!("Failed to show main window: {}", e))?;
        main_window
            .set_focus()
            .map_err(|e| format!("Failed to focus main window: {}", e))?;
        debug!("Main window shown and focused");
    } else {
        return Err("Main window not found".to_string());
    }

    // Close the splash screen window
    if let Some(splash_window) = app_handle.get_webview_window("splashscreen") {
        splash_window
            .close()
            .map_err(|e| format!("Failed to close splash screen: {}", e))?;
        debug!("Splash screen window closed");
    } else {
        debug!("Splash screen window not found, may have already been closed");
    }

    Ok(())
}
