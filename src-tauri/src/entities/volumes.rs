use bollard::models::{VolumePruneResponse, VolumeScopeEnum, VolumeUsageData};
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

/// Outcome of a volume prune, taken verbatim from the daemon's prune response.
///
/// Never derive these numbers by diffing the volume list before and after the
/// prune: that races with anything else touching the daemon and cannot tell a
/// pruned volume from one created or removed concurrently.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct VolumePruneResult {
    pub volumes_deleted: Vec<String>,
    pub space_reclaimed: i64,
}

impl From<VolumePruneResponse> for VolumePruneResult {
    fn from(response: VolumePruneResponse) -> Self {
        VolumePruneResult {
            volumes_deleted: response.volumes_deleted.unwrap_or_default(),
            space_reclaimed: response.space_reclaimed.unwrap_or_default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn prune_result_takes_the_daemon_response_verbatim() {
        let response = VolumePruneResponse {
            volumes_deleted: Some(vec!["anon-a".to_string(), "anon-b".to_string()]),
            space_reclaimed: Some(2048),
        };

        let result = VolumePruneResult::from(response);

        assert_eq!(result.volumes_deleted, vec!["anon-a", "anon-b"]);
        assert_eq!(result.space_reclaimed, 2048);
    }

    #[test]
    fn prune_result_reports_nothing_deleted_when_the_daemon_omits_the_fields() {
        // The daemon omits both fields when it removed nothing. That must read
        // as "zero volumes deleted", never as missing data to be filled in by
        // some client-side estimate.
        let result = VolumePruneResult::from(VolumePruneResponse {
            volumes_deleted: None,
            space_reclaimed: None,
        });

        assert!(result.volumes_deleted.is_empty());
        assert_eq!(result.space_reclaimed, 0);
    }
}
