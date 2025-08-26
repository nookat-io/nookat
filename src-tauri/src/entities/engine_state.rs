use crate::entities::{
    Container, DockerInfo, EngineInfo, EngineStatus, Image, Network, PruneResult, Volume,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Centralized, serializable view of the Docker engine state.
#[derive(Debug, Serialize, Deserialize)]
pub struct EngineState {
    // Core collections
    pub containers: HashMap<String, Container>,
    pub images: HashMap<String, Image>,
    pub volumes: HashMap<String, Volume>,
    pub networks: HashMap<String, Network>,

    // Engine state information
    pub engine_status: EngineStatus,
    pub docker_info: Option<DockerInfo>,

    // Prune operations tracking
    pub last_prune_results: HashMap<String, PruneResult>,

    // Metadata
    pub version: u64,
    pub last_updated: DateTime<Utc>,
}

impl Default for EngineState {
    fn default() -> Self {
        Self {
            containers: HashMap::new(),
            images: HashMap::new(),
            volumes: HashMap::new(),
            networks: HashMap::new(),
            engine_status: EngineStatus::Unknown,
            docker_info: None,
            last_prune_results: HashMap::new(),
            version: 0,
            last_updated: Utc::now(),
        }
    }
}

impl EngineState {
    /// Create a new, empty engine state with unknown engine status.
    pub fn new() -> Self {
        Self::default()
    }

    /// Create a new engine state with a provided engine info, marking it as Installed.
    pub fn with_engine_info(engine_info: EngineInfo) -> Self {
        Self {
            engine_status: EngineStatus::Installed(engine_info),
            ..Self::default()
        }
    }
}
