use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use crate::entities::config::Theme;
use crate::entities::config::Language;
use crate::entities::config::VersionedAppConfig;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TelemetrySettings {
    pub send_anonymous_usage_data: bool,
    pub error_reporting: bool,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfigV1 {
    pub theme: Theme,
    pub language: Language,
    pub telemetry: TelemetrySettings,
    pub startup: StartupSettings,
    // pub docker_engine: DockerEngineSettings,
    // pub network: NetworkSettings,
    // pub security: SecuritySettings,
    // pub advanced: AdvancedSettings,
    // pub ui_ux: UiUxSettings,
}

impl Default for AppConfigV1 {
    fn default() -> Self {
        Self {
            theme: Theme::default(),
            language: Language::default(),
            telemetry: TelemetrySettings::default(),
            startup: StartupSettings::default(),
        }
    }
}

impl From<AppConfigV1> for VersionedAppConfig {
    fn from(v1: AppConfigV1) -> Self {
        VersionedAppConfig::V1(v1)
    }
}
