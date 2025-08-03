use crate::entities::{AppConfig, Theme};
use serde_json;
use std::fs;
use std::path::PathBuf;

fn get_config_path() -> PathBuf {
    let home_dir = dirs::home_dir().expect("Could not find home directory");
    home_dir.join(".nookat").join("config.json")
}

fn ensure_config_dir() -> Result<(), String> {
    let config_path = get_config_path();
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }
    Ok(())
}

/// Get the current configuration
#[tauri::command]
pub async fn get_config() -> Result<AppConfig, String> {
    let config_path = get_config_path();

    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config file: {}", e))?;

        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config file: {}", e))
    } else {
        // Create default config if it doesn't exist
        let default_config = AppConfig::default();
        save_config(&default_config)?;
        Ok(default_config)
    }
}

/// Save configuration to file
fn save_config(config: &AppConfig) -> Result<(), String> {
    ensure_config_dir()?;

    let config_path = get_config_path();
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;

    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config file: {}", e))
}

/// Update the theme
#[tauri::command]
pub async fn update_theme(theme: String) -> Result<(), String> {
    let mut config = get_config().await?;

    config.theme = match theme.as_str() {
        "light" => Theme::Light,
        "dark" => Theme::Dark,
        "system" => Theme::System,
        _ => return Err("Invalid theme value".to_string()),
    };

    save_config(&config)
}

/// Get the current theme
#[tauri::command]
pub async fn get_theme() -> Result<String, String> {
    let config = get_config().await?;


    // INSERT_YOUR_CODE
    std::thread::sleep(std::time::Duration::from_secs(10));

    Ok(config.theme.as_str().to_string())
}
