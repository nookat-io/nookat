use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct SystemInfo {
    pub cpu_usage: f32,
    pub memory_usage: f32,
    pub disk_usage: f32,
}
