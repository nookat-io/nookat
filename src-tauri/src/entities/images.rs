use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Image {
    pub id: String,
    pub repository: Option<String>,
    pub tag: Option<String>,
    pub image_id: String,
    pub created: i64,
    pub size: i64,
    pub in_use: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PruneResult {
    pub images_deleted: Vec<String>,
    pub space_reclaimed: i64,
}
