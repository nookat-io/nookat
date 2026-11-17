use crate::entities::{AppConfig, AppConfigV1, VersionedAppConfig};
use std::fs;
use std::path::PathBuf;
use tracing::{debug, info, instrument, warn};

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
    pub fn migrate_config(versioned_config: VersionedAppConfig) -> Result<AppConfig, String> {
        let mut versioned_config = versioned_config;

        loop {
            versioned_config = match versioned_config {
                VersionedAppConfig::V1(config) => {
                    info!("Migrating config from V1 to V2");
                    VersionedAppConfig::V2(config.into())
                }
                VersionedAppConfig::V2(config) => {
                    debug!("Config already at V2, no migration needed");
                    return Ok(config);
                }
            };
        }
    }

    #[instrument(skip_all, err)]
    pub fn get_config() -> Result<AppConfig, String> {
        let config_path = ConfigService::get_config_path()?;

        let config = if config_path.exists() {
            let content = fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read config file: {}", e))?;
            ConfigService::parse_config(&content)?
        } else {
            info!("Config file does not exist, creating default config");
            AppConfig::default()
        };

        ConfigService::save_config(&config)?;
        Ok(config)
    }

    fn parse_config(content: &str) -> Result<AppConfig, String> {
        if let Ok(versioned_config) = serde_json::from_str::<VersionedAppConfig>(content) {
            return ConfigService::migrate_config(versioned_config);
        }

        match serde_json::from_str::<AppConfigV1>(content) {
            Ok(untagged_v1_config) => {
                warn!("Detected legacy V1 config, migrating to V2");
                Ok(AppConfig::from(untagged_v1_config))
            }
            Err(e) => {
                warn!("Config file is corrupted, falling back to defaults: {}", e);
                Ok(AppConfig::default())
            }
        }
    }

    #[instrument(skip_all, err)]
    pub fn save_config(config: &AppConfig) -> Result<(), String> {
        ConfigService::ensure_config_dir()?;

        let config_path = ConfigService::get_config_path()?;

        let versioned_config = VersionedAppConfig::from(config.clone());

        let content = serde_json::to_string_pretty(&versioned_config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        fs::write(&config_path, content).map_err(|e| format!("Failed to write config file: {}", e))
    }
}
