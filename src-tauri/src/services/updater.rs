use crate::services::ConfigService;
use chrono::Utc;

pub struct UpdaterService;

impl UpdaterService {
    pub fn update_last_update_check() -> Result<(), String> {
        ConfigService::update_config(|config| {
            config.startup.last_update_check = Some(Utc::now());
        })
    }
}
