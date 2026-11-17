mod colima;
mod docker_info;
use bollard::Docker;

pub use self::colima::*;
pub use self::docker_info::*;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct ColimaEngineInfo {
    pub colima_version: String,
    pub colima_checksum: Option<String>,
    pub colima_download_url: Option<String>,

    pub lima_version: Option<String>,
    pub lima_checksum: Option<String>,
    pub lima_download_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum EngineInfo {
    Colima(ColimaEngineInfo),
    Docker,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Default)]
pub enum EngineStatus {
    #[default]
    Unknown,
    Installed(EngineInfo),
    Running(EngineInfo),
}

#[derive(Debug, Clone)]
pub struct Engine {
    pub engine_status: EngineStatus,
    pub docker: Option<Docker>,
}

impl Engine {
    pub fn is_running(&self) -> bool {
        matches!(self.engine_status, EngineStatus::Running(_))
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum InstallationMethod {
    Homebrew,
    Binary,
}

#[cfg(target_os = "macos")]
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InstallationProgress {
    pub step: String,
    pub message: String,
    pub percentage: u8,
    pub logs: Vec<String>,
}

#[cfg(target_os = "macos")]
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ColimaEngineStopProgress {
    pub step: String,
    pub message: String,
    pub percentage: u8,
    pub logs: Vec<String>,
}
