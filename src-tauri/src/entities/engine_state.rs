use crate::entities::{Container, DockerInfo, EngineStatus, Image, Network, PruneResult, Volume};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Centralized, serializable view of the Docker engine state.
#[derive(Debug, Serialize, Deserialize, Clone)]
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
