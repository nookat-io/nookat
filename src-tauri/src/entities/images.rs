use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct Image {
    pub id: String,
    pub repository: Option<String>,
    pub tag: Option<String>,
    pub image_id: String,
    pub created: i64,
    pub size: i64,
    pub in_use: bool,
    pub dangling: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PruneResult {
    pub images_deleted: Vec<String>,
    pub space_reclaimed: i64,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct DockerHubTag {
    pub name: String,
    pub size: Option<u64>,
    pub last_pushed: Option<String>,
    pub platforms: Vec<String>,
}
