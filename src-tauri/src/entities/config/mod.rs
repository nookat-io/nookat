mod i18n;
mod theme;

pub use i18n::*;
pub use theme::*;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TelemetrySettings {
    pub send_anonymous_usage_data: bool,
    pub error_reporting: bool,
    // pub feedback_collection: bool,
    // pub telemetry_settings: TelemetryConfig,
    // pub error_reporting: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupSettings {
    pub start_on_system_startup: bool,
    pub minimize_to_tray: bool,
    pub check_for_updates: bool,
    pub last_update_check: Option<DateTime<Utc>>,
    pub auto_update_settings: bool,
}

impl Default for StartupSettings {
    fn default() -> Self {
        Self {
            start_on_system_startup: false,
            minimize_to_tray: true,
            check_for_updates: true,
            last_update_check: None,
            auto_update_settings: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub theme: Theme,
    pub language: Language,

    pub telemetry: TelemetrySettings,
    pub startup: StartupSettings,
    // pub engine: EngineSettings,
    // pub docker_engine: DockerEngineSettings,
    // pub network: NetworkSettings,
    // pub security: SecuritySettings,
    // pub advanced: AdvancedSettings,
    // pub ui_ux: UiUxSettings,
}
