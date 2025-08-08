use crate::entities::AppConfig;
use std::path::PathBuf;
use std::fs;
use tracing::{warn, instrument};

pub struct ConfigService;

impl ConfigService {
    #[instrument(skip_all, err)]
    pub fn get_config_path() -> Result<PathBuf, String> {
        dirs::home_dir()
            .ok_or_else(|| "Could not determine home directory".to_string())
            .map(|home_dir| home_dir.join(".nookat").join("config.json"))
    }

    #[instrument(skip_all, err)]
    pub fn ensure_config_dir() -> Result<(), String> {
        let config_path = ConfigService::get_config_path()?;
        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }
        Ok(())
    }

    #[instrument(skip_all, err)]
    pub fn get_config() -> Result<AppConfig, String> {
        let config_path = ConfigService::get_config_path()?;

        if config_path.exists() {
            let content = fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read config file: {}", e))?;

            serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse config file: {}", e))
        } else {
            // Create default config if it doesn't exist
            warn!("Config file does not exist, creating default config");
            let default_config = AppConfig::default();
            ConfigService::save_config(&default_config)?;
            Ok(default_config)
        }
    }

    /// Save configuration to file
    #[instrument(skip_all, err)]
    pub fn save_config(config: &AppConfig) -> Result<(), String> {
        ConfigService::ensure_config_dir()?;

        let config_path = ConfigService::get_config_path()?;
        let content = serde_json::to_string_pretty(config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        fs::write(&config_path, content)
            .map_err(|e| format!("Failed to write config file: {}", e))
    }
}
