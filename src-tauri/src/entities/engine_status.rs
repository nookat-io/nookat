use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum EngineState {
    NotInstalled,
    NotRunning,
    Malfunctioning,
    Healthy,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct EngineStatus {
    pub state: EngineState,
    pub version: Option<String>,
    pub error: Option<String>,
}
