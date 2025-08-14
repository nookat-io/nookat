use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct VmInfo {
    pub cpu: u32,
    pub memory: u64,
    pub disk: u64,
    pub architecture: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ColimaStatus {
    pub is_installed: bool,
    pub is_running: bool,
    pub vm_info: Option<VmInfo>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EngineSetupStatus {
    pub docker_status: super::docker_info::DockerStatus,
    pub colima_status: ColimaStatus,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct VmConfig {
    pub cpu_cores: u8,
    pub memory_gb: u8,
    pub disk_gb: u8,
    pub architecture: String,
}

impl Default for VmConfig {
    fn default() -> Self {
        Self {
            cpu_cores: 2,
            memory_gb: 4,
            disk_gb: 20,
            architecture: "auto".to_string(),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InstallationProgress {
    pub step: String,
    pub message: String,
    pub percentage: u8,
    pub logs: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HomebrewStatus {
    pub is_available: bool,
    pub version: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct VersionInfo {
    pub colima_version: String,
    pub lima_version: String,
    pub colima_checksum: String,
    pub lima_checksum: String,
    pub download_urls: DownloadUrls,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DownloadUrls {
    pub colima: String,
    pub lima: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DownloadResult {
    pub colima_path: String,
    pub lima_path: String,
    pub download_size: u64,
    pub download_time: Duration,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DownloadProgress {
    pub binary: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub speed_bytes_per_sec: u64,
    pub eta_seconds: u64,
}
