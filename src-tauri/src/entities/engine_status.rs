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
    Malfunctioning
}

/// The status of the container engine
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EngineStatus {
    /// The name of the container engine (e.g. "Docker Engine", "containerd", "nerdctl")
    pub name: String,

    /// The state of the container engine
    pub state: EngineState,

    /// The version of the container engine
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,

    /// The error message of the container engine
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
