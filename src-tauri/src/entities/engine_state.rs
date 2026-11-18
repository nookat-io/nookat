use crate::entities::{Container, EngineStatus, Image, Network, Volume};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct EngineState {
    pub containers: HashMap<String, Container>,
    pub images: HashMap<String, Image>,
    pub volumes: HashMap<String, Volume>,
    pub networks: HashMap<String, Network>,
    pub engine_status: EngineStatus,
    pub version: u64,
    pub last_updated: DateTime<Utc>,
}
