use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ImagePullPhase {
    Pending,
    Downloading,
    Downloaded,
    Extracting,
    Complete,
    AlreadyExists,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct ImagePullLayer {
    pub id: String,
    pub phase: ImagePullPhase,
    pub size: Option<u64>,
    pub downloaded: u64,
    pub extracted: u64,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImagePullRequest {
    pub pull_id: String,
    pub image_name: String,
    pub tag: String,
    pub registry: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ImagePullOutcome {
    Completed,
    Cancelled,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq, Default)]
pub struct ImagePullProgress {
    pub layers: Vec<ImagePullLayer>,
}
