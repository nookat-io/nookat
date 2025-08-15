use crate::services::config::ConfigService;
use chrono::Utc;

pub struct UpdaterService;

impl UpdaterService {
    /// Update the last update check timestamp
    pub fn update_last_update_check() -> Result<(), Box<dyn std::error::Error>> {
        let mut config = ConfigService::get_config()?;
        config.startup.last_update_check = Some(Utc::now());
        ConfigService::save_config(&config)?;
        Ok(())
    }
}
