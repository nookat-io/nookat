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
