use crate::entities::{AppConfig, AppConfigV1, VersionedAppConfig};
use std::fs::{self, File};
use std::io::{ErrorKind, Write};
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use tracing::{debug, info, instrument, warn};

static CONFIG_FILE: Mutex<()> = Mutex::new(());

fn lock_config_file() -> MutexGuard<'static, ()> {
    CONFIG_FILE
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

pub struct ConfigService;

impl ConfigService {
    #[instrument(skip_all, err)]
    pub fn get_config_path() -> Result<PathBuf, String> {
        dirs::home_dir()
            .ok_or_else(|| "Could not determine home directory".to_string())
            .map(|home_dir| home_dir.join(".nookat").join("config.json"))
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
        load_config(&ConfigService::get_config_path()?)
    }

    #[instrument(skip_all, err)]
    pub fn update_config(change: impl FnOnce(&mut AppConfig)) -> Result<(), String> {
        change_config(&ConfigService::get_config_path()?, change)
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
}

fn read_config_file(path: &Path) -> Result<AppConfig, String> {
    let stored_content = match fs::read_to_string(path) {
        Ok(content) => Some(content),
        Err(e) if e.kind() == ErrorKind::NotFound => {
            info!("Config file does not exist, creating default config");
            None
        }
        Err(e) => return Err(format!("Failed to read config file: {}", e)),
    };

    let config = match &stored_content {
        Some(content) => ConfigService::parse_config(content)?,
        None => AppConfig::default(),
    };

    let current_content = serialize_config(&config)?;
    if stored_content.as_deref() != Some(current_content.as_str()) {
        replace_config_file(path, &current_content)?;
    }

    Ok(config)
}

fn load_config(path: &Path) -> Result<AppConfig, String> {
    let _config_file = lock_config_file();
    read_config_file(path)
}

fn change_config(path: &Path, change: impl FnOnce(&mut AppConfig)) -> Result<(), String> {
    let _config_file = lock_config_file();
    let mut config = read_config_file(path)?;
    change(&mut config);
    replace_config_file(path, &serialize_config(&config)?)
}

fn serialize_config(config: &AppConfig) -> Result<String, String> {
    serde_json::to_string_pretty(&VersionedAppConfig::from(config.clone()))
        .map_err(|e| format!("Failed to serialize config: {}", e))
}

fn replace_config_file(path: &Path, content: &str) -> Result<(), String> {
    let directory = path
        .parent()
        .ok_or_else(|| format!("Config path has no parent directory: {}", path.display()))?;
    fs::create_dir_all(directory)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;

    let staged_path = path.with_extension("json.tmp");
    let write_staged = || -> std::io::Result<()> {
        let mut staged = File::create(&staged_path)?;
        staged.write_all(content.as_bytes())?;
        staged.sync_all()
    };
    write_staged().map_err(|e| format!("Failed to write config file: {}", e))?;

    fs::rename(&staged_path, path).map_err(|e| format!("Failed to replace config file: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::Theme;
    use chrono::DateTime;
    use std::thread;
    use std::time::{Duration, SystemTime};

    fn config_path_in(directory: &tempfile::TempDir) -> PathBuf {
        directory.path().join(".nookat").join("config.json")
    }

    fn set_theme(path: &Path, theme: Theme) {
        change_config(path, |config| {
            config.theme = theme;
        })
        .unwrap();
    }

    fn modified_at(path: &Path) -> SystemTime {
        fs::metadata(path).unwrap().modified().unwrap()
    }

    fn record_one_more_check(config: &mut AppConfig) {
        let checks_so_far = config
            .startup
            .last_update_check
            .map_or(0, |at| at.timestamp());
        config.startup.last_update_check = DateTime::from_timestamp(checks_so_far + 1, 0);
    }

    #[test]
    fn test_missing_config_file_is_created_with_defaults() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);

        let config = load_config(&path).unwrap();

        assert_eq!(config, AppConfig::default());
        assert_eq!(
            fs::read_to_string(&path).unwrap(),
            serialize_config(&AppConfig::default()).unwrap()
        );
    }

    #[test]
    fn test_reading_a_current_config_leaves_the_file_untouched() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        set_theme(&path, Theme::Dark);
        let written_at = modified_at(&path);
        thread::sleep(Duration::from_millis(20));

        load_config(&path).unwrap();

        assert_eq!(modified_at(&path), written_at);
    }

    #[test]
    fn test_update_keeps_the_other_settings() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        change_config(&path, |config| {
            config.sidebar_collapsed = true;
        })
        .unwrap();

        set_theme(&path, Theme::Light);

        let config = load_config(&path).unwrap();
        assert_eq!(config.theme, Theme::Light);
        assert!(config.sidebar_collapsed);
    }

    #[test]
    fn test_reads_during_writes_never_see_a_partial_file() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        set_theme(&path, Theme::Dark);

        let writer = {
            let path = path.clone();
            thread::spawn(move || {
                let content = fs::read_to_string(&path).unwrap();
                for _ in 0..200 {
                    replace_config_file(&path, &content).unwrap();
                }
            })
        };
        let readers: Vec<_> = (0..4)
            .map(|_| {
                let path = path.clone();
                thread::spawn(move || {
                    (0..200)
                        .filter(|_| {
                            let content = fs::read_to_string(&path).unwrap();
                            ConfigService::parse_config(&content).unwrap().theme != Theme::Dark
                        })
                        .count()
                })
            })
            .collect();

        writer.join().unwrap();
        let reads_without_the_saved_theme: usize = readers
            .into_iter()
            .map(|reader| reader.join().unwrap())
            .sum();
        assert_eq!(reads_without_the_saved_theme, 0);
    }

    #[test]
    fn test_concurrent_updates_are_not_lost() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        load_config(&path).unwrap();

        let updaters: Vec<_> = (0..8)
            .map(|_| {
                let path = path.clone();
                thread::spawn(move || {
                    for _ in 0..25 {
                        change_config(&path, record_one_more_check).unwrap();
                    }
                })
            })
            .collect();
        for updater in updaters {
            updater.join().unwrap();
        }

        let config = load_config(&path).unwrap();
        assert_eq!(
            config.startup.last_update_check.map(|at| at.timestamp()),
            Some(200)
        );
    }
}
