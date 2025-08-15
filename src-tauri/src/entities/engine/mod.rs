mod docker_info;
use bollard::Docker;

pub use self::docker_info::*;

use serde::{Deserialize, Serialize};
use tracing::instrument;

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

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ColimaEngineInfo {
    pub colima_version: String,
    pub colima_checksum: String,
    pub colima_download_url: String,

    pub lima_version: String,
    pub lima_checksum: String,
    pub lima_download_url: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ContextInfo {
    pub current_context: String,
    pub docker_host: Option<String>,
    pub available_contexts: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum EngineInfo {
    Colima(ColimaEngineInfo),
    Docker,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
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
