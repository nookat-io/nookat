use crate::entities::{AppConfig, Theme, Language, TelemetrySettings, StartupSettings};
use tokio::fs;
use std::path::PathBuf;
use tracing::instrument;

#[instrument(skip_all, err)]
fn get_config_path() -> Result<PathBuf, String> {
    dirs::home_dir()
        .ok_or_else(|| "Could not determine home directory".to_string())
        .map(|home_dir| home_dir.join(".nookat").join("config.json"))
}

#[instrument(skip_all, err)]
async fn ensure_config_dir() -> Result<(), String> {
    let config_path = get_config_path()?;
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).await
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    Ok(())
}

/// Get the current configuration
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_config() -> Result<AppConfig, String> {
    let config_path = get_config_path()?;

    if config_path.exists() {
        let content = fs::read_to_string(&config_path).await
            .map_err(|e| format!("Failed to read config file: {}", e))?;

        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config file: {}", e))
    } else {
        // Create default config if it doesn't exist
        let default_config = AppConfig::default();
        save_config(&default_config).await?;
        Ok(default_config)
    }
}

/// Save configuration to file
#[instrument(skip_all, err)]
async fn save_config(config: &AppConfig) -> Result<(), String> {
    ensure_config_dir().await?;

    let config_path = get_config_path()?;
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content).await
        .map_err(|e| format!("Failed to write config file: {}", e))
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

    save_config(&config).await
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
    let mut config = get_config().await?;
    config.telemetry = settings;
    save_config(&config).await
}

/// Update startup settings
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn update_startup_settings(settings: StartupSettings) -> Result<(), String> {
    let mut config = get_config().await?;
    config.startup = settings;
    save_config(&config).await
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

    save_config(&config).await
}

/// Get the current language
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_language() -> Result<String, String> {
    let config = get_config().await?;
    Ok(config.language.as_str().to_string())
}
