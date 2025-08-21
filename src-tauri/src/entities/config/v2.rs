use serde::{Deserialize, Serialize};
use crate::entities::config::Theme;
use crate::entities::config::Language;
use crate::entities::config::TelemetrySettings;
use crate::entities::config::StartupSettings;
use crate::entities::config::AppConfigV1;
use crate::entities::config::VersionedAppConfig;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfigV2 {
    pub theme: Theme,
    pub language: Language,
    pub telemetry: TelemetrySettings,
    pub startup: StartupSettings,
}

impl Default for AppConfigV2 {
    fn default() -> Self {
        Self {
            theme: Theme::default(),
            language: Language::default(),
            telemetry: TelemetrySettings::default(),
            startup: StartupSettings::default(),
        }
    }
}

impl From<AppConfigV1> for AppConfigV2 {
    fn from(v1: AppConfigV1) -> Self {
        Self {
            theme: v1.theme,
            language: v1.language,
            telemetry: v1.telemetry,
            startup: v1.startup,
        }
    }
}

impl From<AppConfigV2> for VersionedAppConfig {
    fn from(v2: AppConfigV2) -> Self {
        VersionedAppConfig::V2(v2)
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;
    use crate::entities::config::VersionedAppConfig;

    #[test]
    fn test_v1_to_v2_migration() {
        let v1_config = AppConfigV1 {
            theme: Theme::Dark,
            language: Language::Russian,
            telemetry: TelemetrySettings {
                send_anonymous_usage_data: true,
                error_reporting: false,
            },
            startup: StartupSettings {
                start_on_system_startup: true,
                minimize_to_tray: false,
                check_for_updates: true,
                last_update_check: None,
                auto_update_settings: true,
            },
        };

        // Migrate to V2
        let v2_config: AppConfigV2 = v1_config.into();

        // Verify migration
        assert_eq!(v2_config.theme, Theme::Dark);
        assert_eq!(v2_config.language, Language::Russian);
        assert_eq!(v2_config.telemetry.send_anonymous_usage_data, true);
        assert_eq!(v2_config.telemetry.error_reporting, false);
        assert_eq!(v2_config.startup.start_on_system_startup, true);
        assert_eq!(v2_config.startup.minimize_to_tray, false);
        assert_eq!(v2_config.startup.check_for_updates, true);
        assert_eq!(v2_config.startup.auto_update_settings, true);
    }

    #[test]
    fn test_versioned_config_serialization() {
        let v2_config = AppConfigV2 {
            theme: Theme::Light,
            language: Language::English,
            telemetry: TelemetrySettings::default(),
            startup: StartupSettings::default(),
        };

        // Serialize to JSON
        let json = serde_json::to_string(&v2_config).unwrap();

        // Deserialize back
        let deserialized: AppConfigV2 = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.theme, Theme::Light);
    }

    #[test]
    fn test_versioned_config_enum_serialization() {
        let v2_config = AppConfigV2 {
            theme: Theme::System,
            language: Language::English,
            telemetry: TelemetrySettings::default(),
            startup: StartupSettings::default(),
        };

        let versioned_config = VersionedAppConfig::V2(v2_config);

        let json = serde_json::to_string(&versioned_config).unwrap();

        assert!(json.contains("\"version\":\"2\""));

        let deserialized: VersionedAppConfig = serde_json::from_str(&json).unwrap();
        match deserialized {
            VersionedAppConfig::V2(config) => {
                assert_eq!(config.theme, Theme::System);
            }
            _ => panic!("Expected V2 config"),
        }
    }
}
