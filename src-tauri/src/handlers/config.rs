use crate::entities::{AppConfig, Language, StartupSettings, TelemetrySettings, Theme};
use crate::services::{ConfigService, UpdaterService};
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_config() -> Result<AppConfig, String> {
    ConfigService::get_config()
}

/// Update the theme
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_theme(theme: String) -> Result<(), String> {
    let mut config = get_config().await?;

    config.theme = match theme.as_str() {
        "light" => Theme::Light,
        "dark" => Theme::Dark,
        "system" => Theme::System,
        _ => return Err("Invalid theme value".to_string()),
    };

    ConfigService::save_config(&config)
}

/// Get the current theme
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_theme() -> Result<String, String> {
    let config = get_config().await?;
    Ok(config.theme.as_str().to_string())
}

/// Update telemetry settings
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_telemetry_settings(settings: TelemetrySettings) -> Result<(), String> {
    debug!("Updating telemetry settings: {:?}", settings);
    let mut config = get_config().await?;
    config.telemetry = settings;
    ConfigService::save_config(&config)
}

/// Update startup settings
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_startup_settings(settings: StartupSettings) -> Result<(), String> {
    let mut config = get_config().await?;
    config.startup = settings;
    ConfigService::save_config(&config)
}

/// Update language
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_language(language: String) -> Result<(), String> {
    let mut config = get_config().await?;

    config.language = match language.as_str() {
        "en" => Language::English,
        "ru" => Language::Russian,
        _ => return Err("Invalid language value".to_string()),
    };

    ConfigService::save_config(&config)
}

/// Get the current language
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_language() -> Result<String, String> {
    let config = get_config().await?;
    Ok(config.language.as_str().to_string())
}

/// Update last update check timestamp
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_last_update_check() -> Result<(), String> {
    debug!("Updating last update check timestamp");
    UpdaterService::update_last_update_check()
        .map_err(|e| format!("Failed to update last update check: {}", e))
}
