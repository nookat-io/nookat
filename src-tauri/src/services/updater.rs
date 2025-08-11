use crate::services::ConfigService;
use chrono::Utc;
use tauri::App;
use tracing::info;

pub struct UpdaterService;

impl UpdaterService {
    /// Initialize the updater service
    pub fn init(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
        #[cfg(desktop)]
        {
            // Initialize the updater plugin
            let _ = app
                .handle()
                .plugin(tauri_plugin_updater::Builder::new().build());

            info!("Updater service initialized successfully");
        }

        Ok(())
    }

    /// Update the last update check timestamp
    pub fn update_last_update_check() -> Result<(), Box<dyn std::error::Error>> {
        let mut config = ConfigService::get_config()?;
        config.startup.last_update_check = Some(Utc::now());
        ConfigService::save_config(&config)?;
        Ok(())
    }
}
