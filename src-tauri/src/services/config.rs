use crate::entities::{AppConfig, AppConfigV1, VersionedAppConfig};
use std::fs;
use std::path::PathBuf;
use tracing::{info, instrument, warn};

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

    /// Migrate config from any version to the current version
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
                    info!("Config already at V2, no migration needed");
                    return Ok(config);
                }
            };
        }
    }

    /// Get current configuration with automatic migration
    #[instrument(skip_all, err)]
    pub fn get_config() -> Result<AppConfig, String> {
        let config_path = ConfigService::get_config_path()?;

        if config_path.exists() {
            let content = fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read config file: {}", e))?;

            // First, try to parse as versioned config
            match serde_json::from_str::<VersionedAppConfig>(&content) {
                Ok(versioned_config) => {
                    let migrated_config = ConfigService::migrate_config(versioned_config)?;
                    ConfigService::save_config(&migrated_config)?;
                    Ok(migrated_config)
                }
                Err(_) => {
                    // Try to parse as legacy V1 config
                    match serde_json::from_str::<AppConfigV1>(&content) {
                        Ok(legacy_config) => {
                            info!("Detected legacy V1 config, migrating to V2");
                            let migrated_config = AppConfig::from(legacy_config);
                            // Save the migrated config to update the file
                            ConfigService::save_config(&migrated_config)?;
                            Ok(migrated_config)
                        }
                        Err(e) => {
                            // Config is corrupted, fall back to defaults
                            warn!("Config file is corrupted, falling back to defaults: {}", e);
                            let default_config = AppConfig::default();
                            ConfigService::save_config(&default_config)?;
                            Ok(default_config)
                        }
                    }
                }
            }
        } else {
            // Create default config if it doesn't exist
            info!("Config file does not exist, creating default config");
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

        let versioned_config = VersionedAppConfig::from(config.clone());
        let content = serde_json::to_string_pretty(&versioned_config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        fs::write(&config_path, content).map_err(|e| format!("Failed to write config file: {}", e))
    }
}
