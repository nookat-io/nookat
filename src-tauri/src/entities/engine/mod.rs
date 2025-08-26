mod docker_info;
use bollard::Docker;

pub use self::docker_info::*;

use serde::{Deserialize, Serialize};

/// The state of the container engine
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum EngineState {
    /// The container engine is not installed
    NotInstalled,
    /// The container engine is not running
    NotRunning,
    /// The container engine is healthy
    Healthy,
    /// The container engine is malfunctioning
    Malfunctioning,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum ColimaStatus {
    Unknown,
    Installed,
    Running,
    NotInstalled,
}

type HomebrewVersion = String;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum HomebrewStatus {
    Unknown,
    Installed(HomebrewVersion),
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct ColimaEngineInfo {
    pub colima_version: String,
    pub colima_checksum: Option<String>,
    pub colima_download_url: Option<String>,

    pub lima_version: Option<String>,
    pub lima_checksum: Option<String>,
    pub lima_download_url: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ContextInfo {
    pub current_context: String,
    pub docker_host: Option<String>,
    pub available_contexts: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum EngineInfo {
    Colima(ColimaEngineInfo),
    Docker,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub enum EngineStatus {
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

// Installation-related types
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum InstallationMethod {
    Homebrew,
    Binary,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct InstallationProgress {
    pub step: String,
    pub message: String,
    pub percentage: u8,
    pub logs: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ColimaConfig {
    pub cpu: u8,
    pub memory: u16,
    pub disk: u16,
    pub architecture: String,
}

impl Default for ColimaConfig {
    fn default() -> Self {
        Self {
            cpu: 4,
            memory: 8,
            disk: 60,
            architecture: "host".to_string(),
        }
    }
}
