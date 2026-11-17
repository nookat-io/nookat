use crate::entities::{Container, DockerInfo, EngineStatus, Image, Network, Volume};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Centralized, serializable view of the Docker engine state.
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct EngineState {
    // Core collections
    pub containers: HashMap<String, Container>,
    pub images: HashMap<String, Image>,
    pub volumes: HashMap<String, Volume>,
    pub networks: HashMap<String, Network>,

    // Engine state information
    pub engine_status: EngineStatus,
    pub docker_info: Option<DockerInfo>,

    // Metadata
    /// Publication sequence number. Every snapshot the engine state monitor
    /// publishes is one higher than the last, in the order the state was read,
    /// so a higher version is always the fresher snapshot.
    pub version: u64,
    pub last_updated: DateTime<Utc>,
}
