use crate::services::ConfigService;
use chrono::Utc;

pub struct UpdaterService;

impl UpdaterService {
    pub fn update_last_update_check() -> Result<(), String> {
        let mut config = ConfigService::get_config()?;
        config.startup.last_update_check = Some(Utc::now());
        ConfigService::save_config(&config)?;
        Ok(())
    }
}
