use crate::entities::{AppConfig, AppConfigV1, VersionedAppConfig};
use chrono::Utc;
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

static UNREADABLE_CONFIG_BACKUP: Mutex<Option<PathBuf>> = Mutex::new(None);

fn remember_unreadable_backup(backup: Option<PathBuf>) {
    if let Some(backup) = backup {
        *UNREADABLE_CONFIG_BACKUP
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner()) = Some(backup);
    }
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
        let loaded = load_config(&ConfigService::get_config_path()?)?;
        remember_unreadable_backup(loaded.unreadable_backup);
        Ok(loaded.config)
    }

    #[instrument(skip_all, err)]
    pub fn update_config(change: impl FnOnce(&mut AppConfig)) -> Result<(), String> {
        let unreadable_backup = change_config(&ConfigService::get_config_path()?, change)?;
        remember_unreadable_backup(unreadable_backup);
        Ok(())
    }

    pub fn unreadable_config_backup() -> Option<PathBuf> {
        UNREADABLE_CONFIG_BACKUP
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .clone()
    }

    fn parse_config(content: &str) -> Result<AppConfig, String> {
        let stored: serde_json::Value =
            serde_json::from_str(content).map_err(|e| format!("Invalid JSON: {}", e))?;
        let has_version = stored
            .as_object()
            .ok_or("Config is not a JSON object")?
            .contains_key("version");

        if has_version {
            let versioned_config = serde_json::from_value::<VersionedAppConfig>(stored)
                .map_err(|e| format!("Unsupported config: {}", e))?;
            return ConfigService::migrate_config(versioned_config);
        }

        let untagged_v1_config = serde_json::from_value::<AppConfigV1>(stored)
            .map_err(|e| format!("Unsupported legacy config: {}", e))?;
        warn!("Detected legacy V1 config, migrating to V2");
        Ok(AppConfig::from(untagged_v1_config))
    }
}

#[derive(Debug)]
struct LoadedConfig {
    config: AppConfig,
    unreadable_backup: Option<PathBuf>,
}

fn parse_stored_bytes(bytes: Vec<u8>) -> Result<(String, AppConfig), String> {
    let content =
        String::from_utf8(bytes).map_err(|e| format!("Config is not valid UTF-8: {}", e))?;
    let config = ConfigService::parse_config(&content)?;
    Ok((content, config))
}

fn unreadable_backup_path(path: &Path) -> Result<PathBuf, String> {
    let file_name = path
        .file_name()
        .ok_or_else(|| format!("Config path has no file name: {}", path.display()))?
        .to_string_lossy();
    let moved_at = Utc::now().format("%Y%m%dT%H%M%SZ");
    Ok(path.with_file_name(format!("{}.corrupt-{}", file_name, moved_at)))
}

fn move_unreadable_config_aside(path: &Path, reason: &str) -> Result<PathBuf, String> {
    let backup = unreadable_backup_path(path)?;
    fs::rename(path, &backup)
        .map_err(|e| format!("Failed to keep a copy of the unreadable config file: {}", e))?;
    warn!(
        "Config file could not be read ({}), kept it as {} and started with defaults",
        reason,
        backup.display()
    );
    Ok(backup)
}

fn read_config_file(path: &Path) -> Result<LoadedConfig, String> {
    let stored_bytes = match fs::read(path) {
        Ok(bytes) => Some(bytes),
        Err(e) if e.kind() == ErrorKind::NotFound => {
            info!("Config file does not exist, creating default config");
            None
        }
        Err(e) => return Err(format!("Failed to read config file: {}", e)),
    };

    let (stored_content, config, unreadable_backup) = match stored_bytes.map(parse_stored_bytes) {
        None => (None, AppConfig::default(), None),
        Some(Ok((content, config))) => (Some(content), config, None),
        Some(Err(reason)) => {
            let backup = move_unreadable_config_aside(path, &reason)?;
            (None, AppConfig::default(), Some(backup))
        }
    };

    let current_content = serialize_config(&config)?;
    if stored_content.as_deref() != Some(current_content.as_str()) {
        replace_config_file(path, &current_content)?;
    }

    Ok(LoadedConfig {
        config,
        unreadable_backup,
    })
}

fn load_config(path: &Path) -> Result<LoadedConfig, String> {
    let _config_file = lock_config_file();
    read_config_file(path)
}

fn change_config(
    path: &Path,
    change: impl FnOnce(&mut AppConfig),
) -> Result<Option<PathBuf>, String> {
    let _config_file = lock_config_file();
    let LoadedConfig {
        mut config,
        unreadable_backup,
    } = read_config_file(path)?;
    change(&mut config);
    replace_config_file(path, &serialize_config(&config)?)?;
    Ok(unreadable_backup)
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
    use crate::entities::{Language, Theme};
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

    fn unreadable_copies_next_to(path: &Path) -> Vec<PathBuf> {
        fs::read_dir(path.parent().unwrap())
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .filter(|entry| {
                entry
                    .file_name()
                    .unwrap()
                    .to_string_lossy()
                    .starts_with("config.json.corrupt-")
            })
            .collect()
    }

    fn write_stored_config(path: &Path, content: &[u8]) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, content).unwrap();
    }

    fn assert_moved_aside_and_reset(path: &Path, content: &[u8]) {
        let loaded = load_config(path).unwrap();

        assert_eq!(loaded.config, AppConfig::default());
        let copies = unreadable_copies_next_to(path);
        assert_eq!(copies.len(), 1);
        assert_eq!(fs::read(&copies[0]).unwrap(), content);
        assert_eq!(loaded.unreadable_backup.as_ref(), Some(&copies[0]));
        assert_eq!(
            fs::read_to_string(path).unwrap(),
            serialize_config(&AppConfig::default()).unwrap()
        );

        let reloaded = load_config(path).unwrap();
        assert_eq!(reloaded.unreadable_backup, None);
        assert_eq!(unreadable_copies_next_to(path).len(), 1);
    }

    #[test]
    fn test_missing_config_file_is_created_with_defaults() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);

        let loaded = load_config(&path).unwrap();

        assert_eq!(loaded.config, AppConfig::default());
        assert_eq!(loaded.unreadable_backup, None);
        assert!(unreadable_copies_next_to(&path).is_empty());
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

        let loaded = load_config(&path).unwrap();

        assert_eq!(modified_at(&path), written_at);
        assert_eq!(loaded.unreadable_backup, None);
        assert!(unreadable_copies_next_to(&path).is_empty());
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

        let config = load_config(&path).unwrap().config;
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

        let config = load_config(&path).unwrap().config;
        assert_eq!(
            config.startup.last_update_check.map(|at| at.timestamp()),
            Some(200)
        );
    }

    #[test]
    fn test_unparseable_config_is_moved_aside_before_defaults_are_written() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        let content = br#"{"version":"2","theme":"dark",}"#;
        write_stored_config(&path, content);

        assert_moved_aside_and_reset(&path, content);
    }

    #[test]
    fn test_config_with_a_value_this_build_does_not_know_is_moved_aside() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        let content = br#"{"version":"2","theme":"dark","language":"de"}"#;
        write_stored_config(&path, content);

        assert_moved_aside_and_reset(&path, content);
    }

    #[test]
    fn test_versioned_config_with_a_bad_value_is_not_read_as_legacy_v1() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        let content = br#"{"version":"2","theme":"dark","sidebar_collapsed":"yes"}"#;
        write_stored_config(&path, content);

        let loaded = load_config(&path).unwrap();

        assert_eq!(loaded.config.theme, Theme::System);
        assert_eq!(unreadable_copies_next_to(&path).len(), 1);
    }

    #[test]
    fn test_config_from_a_newer_version_is_moved_aside() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        let content = br#"{"version":"3","theme":"dark","sidebar_collapsed":true}"#;
        write_stored_config(&path, content);

        assert_moved_aside_and_reset(&path, content);
    }

    #[test]
    fn test_config_that_is_not_a_json_object_is_moved_aside() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        let content = br#"["dark"]"#;
        write_stored_config(&path, content);

        assert_moved_aside_and_reset(&path, content);
    }

    #[test]
    fn test_config_that_is_not_utf8_is_moved_aside() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        let content = [0xff, 0xfe];
        write_stored_config(&path, &content);

        assert_moved_aside_and_reset(&path, &content);
    }

    #[test]
    fn test_update_on_an_unreadable_config_applies_on_top_of_defaults() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        write_stored_config(&path, br#"{"version":"2","theme":"dark",}"#);

        set_theme(&path, Theme::Light);

        assert_eq!(unreadable_copies_next_to(&path).len(), 1);
        let config = load_config(&path).unwrap().config;
        assert_eq!(
            config,
            AppConfig {
                theme: Theme::Light,
                ..AppConfig::default()
            }
        );
    }

    #[test]
    fn test_legacy_untagged_v1_config_is_still_migrated() {
        let home = tempfile::tempdir().unwrap();
        let path = config_path_in(&home);
        write_stored_config(&path, br#"{"theme":"dark","language":"ru"}"#);

        let loaded = load_config(&path).unwrap();

        assert_eq!(loaded.config.theme, Theme::Dark);
        assert_eq!(loaded.config.language, Language::Russian);
        assert_eq!(loaded.unreadable_backup, None);
        assert!(unreadable_copies_next_to(&path).is_empty());
        let stored: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(&path).unwrap()).unwrap();
        assert_eq!(stored["version"], "2");
    }
}
