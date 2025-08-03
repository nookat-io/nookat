// WARNING: This file is not used yet, but it is planned to be used in the future
// WARNING: The content of this file is for inspiration for the future features

use serde::{Deserialize, Serialize};


#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerEngineSettings {
    // pub auto_detect_engine: bool -> OK
    // pub engine_restart_behavior: EngineRestartConfig -> OK
    // pub docker_daemon_config: DaemonConfig -> OK
    // pub docker_engine_path: Option<String> -> NEED MORE INFO
    // pub registry_credentials: HashMap<String, RegistryCredential> -> NEED MORE INFO
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkSettings {
    // pub proxy_settings: ProxyConfig -> OK
    // pub network_driver_defaults: String -> NEED MORE INFO
    // pub subnet_gateway_defaults: NetworkDefaults -> NEED MORE INFO
    // pub network_isolation_settings: NetworkIsolationConfig -> NEED MORE INFO
    // pub connectivity_testing: bool -> NEED MORE INFO
    // pub traffic_visualization: bool -> NEED MORE INFO
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecuritySettings {
    // pub vulnerability_scanning: bool -> NEED MORE INFO
    // pub image_signing_verification: bool -> NEED MORE INFO
    // pub compliance_reporting: bool -> NEED MORE INFO
    // pub audit_trail_enabled: bool -> NEED MORE INFO
    // pub encryption_settings: EncryptionConfig -> NEED MORE INFO
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvancedSettings {
    // pub file_system_browser_settings: FileBrowserConfig -> OK
    // pub process_monitoring_settings: ProcessMonitoringConfig -> OK
    // pub network_connectivity_settings: ConnectivityConfig -> OK
    // pub resource_alert_settings: ResourceAlertConfig -> OK
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiUxSettings {
    // pub keyboard_shortcuts: HashMap<String, String> -> OK
    // pub drag_drop_settings: DragDropConfig -> NEED MORE INFO
    // pub show_notifications: bool -> NEED MORE INFO
    // pub tray_notifications: bool -> NEED MORE INFO
    // pub tray_status_display: bool -> NEED MORE INFO
}
