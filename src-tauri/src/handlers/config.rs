use crate::entities::{AppConfig, Language, StartupSettings, TelemetrySettings, Theme};
use crate::sentry::stop_error_reporting;
use crate::services::{ConfigService, UpdaterService};
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_config() -> Result<AppConfig, String> {
    ConfigService::get_config()
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_unreadable_config_backup() -> Result<Option<String>, String> {
    Ok(ConfigService::unreadable_config_backup().map(|backup| backup.display().to_string()))
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_theme(theme: String) -> Result<(), String> {
    let theme = match theme.as_str() {
        "light" => Theme::Light,
        "dark" => Theme::Dark,
        "system" => Theme::System,
        _ => return Err("Invalid theme value".to_string()),
    };

    ConfigService::update_config(|config| {
        config.theme = theme;
    })
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_theme() -> Result<String, String> {
    let config = ConfigService::get_config()?;
    Ok(config.theme.as_str().to_string())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_telemetry_settings(settings: TelemetrySettings) -> Result<(), String> {
    debug!("Updating telemetry settings: {:?}", settings);
    let error_reporting = settings.error_reporting;
    ConfigService::update_config(|config| {
        config.telemetry = settings;
    })?;

    if !error_reporting {
        stop_error_reporting();
    }
    Ok(())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_startup_settings(settings: StartupSettings) -> Result<(), String> {
    ConfigService::update_config(|config| {
        config.startup = settings;
    })
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_language(language: String) -> Result<(), String> {
    let language = match language.as_str() {
        "en" => Language::English,
        "ru" => Language::Russian,
        _ => return Err("Invalid language value".to_string()),
    };

    ConfigService::update_config(|config| {
        config.language = language;
    })
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_language() -> Result<String, String> {
    let config = ConfigService::get_config()?;
    Ok(config.language.as_str().to_string())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_last_update_check() -> Result<(), String> {
    debug!("Updating last update check timestamp");
    UpdaterService::update_last_update_check()
        .map_err(|e| format!("Failed to update last update check: {}", e))
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_sidebar_collapsed(sidebar_collapsed: bool) -> Result<(), String> {
    debug!("Updating sidebar collapsed state to: {}", sidebar_collapsed);
    ConfigService::update_config(|config| {
        config.sidebar_collapsed = sidebar_collapsed;
    })
}
