use serde::{Deserialize, Serialize};

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
