use bollard::models::{VolumeScopeEnum, VolumeUsageData};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VolumeScope {
    #[serde(rename = "")]
    Empty,
    #[serde(rename = "local")]
    Local,
    #[serde(rename = "global")]
    Global,
}

impl From<VolumeScopeEnum> for VolumeScope {
    fn from(scope: VolumeScopeEnum) -> Self {
        match scope {
            VolumeScopeEnum::EMPTY => VolumeScope::Empty,
            VolumeScopeEnum::LOCAL => VolumeScope::Local,
            VolumeScopeEnum::GLOBAL => VolumeScope::Global,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageData {
    pub size: i64,
    pub ref_count: i64,
}

impl From<VolumeUsageData> for UsageData {
    fn from(usage_data: VolumeUsageData) -> Self {
        UsageData {
            size: usage_data.size,
            ref_count: usage_data.ref_count,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Volume {
    pub name: String,
    pub driver: String,
    pub mountpoint: String,
    pub created_at: Option<String>,
    pub status: Option<serde_json::Value>,
    pub labels: HashMap<String, String>,
    pub scope: Option<VolumeScope>,
    pub options: HashMap<String, String>,
    pub usage_data: Option<UsageData>,
}

impl From<bollard::models::Volume> for Volume {
    fn from(volume: bollard::models::Volume) -> Self {
        Volume {
            name: volume.name,
            driver: volume.driver,
            mountpoint: volume.mountpoint,
            created_at: volume.created_at,
            status: volume
                .status
                .map(|s| serde_json::to_value(s).unwrap_or_default()),
            labels: volume.labels,
            scope: volume.scope.map(VolumeScope::from),
            options: volume.options,
            usage_data: volume.usage_data.map(UsageData::from),
        }
    }
}
