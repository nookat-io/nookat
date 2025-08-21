use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use crate::entities::config::Theme;
use crate::entities::config::Language;
use crate::entities::config::VersionedAppConfig;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct TelemetrySettings {
    pub send_anonymous_usage_data: bool,
    pub error_reporting: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub struct StartupSettings {
    pub start_on_system_startup: bool,
    pub minimize_to_tray: bool,
    pub check_for_updates: bool,
    pub last_update_check: Option<DateTime<Utc>>,
    pub auto_update_settings: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
#[serde(default)]
pub struct AppConfigV1 {
    pub theme: Theme,
    pub language: Language,
    pub telemetry: TelemetrySettings,
    pub startup: StartupSettings,
}

impl From<AppConfigV1> for VersionedAppConfig {
    fn from(v1: AppConfigV1) -> Self {
        VersionedAppConfig::V1(v1)
    }
}
