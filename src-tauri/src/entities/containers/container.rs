use crate::entities::containers::{ContainerNetworkSettings, MountPoint, Port};
use bollard::models::ContainerSummary;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ContainerHostConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_mode: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub annotations: Option<HashMap<String, String>>,
}

impl From<bollard::models::ContainerSummaryHostConfig> for ContainerHostConfig {
    fn from(host_config: bollard::models::ContainerSummaryHostConfig) -> Self {
        ContainerHostConfig {
            network_mode: host_config.network_mode,
            annotations: host_config.annotations,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize, Eq, Ord)]
pub enum ContainerState {
    #[serde(rename = "")]
    Empty,

    #[serde(rename = "created")]
    Created,

    #[serde(rename = "running")]
    Running,

    #[serde(rename = "paused")]
    Paused,

    #[serde(rename = "restarting")]
    Restarting,

    #[serde(rename = "exited")]
    Exited,

    #[serde(rename = "removing")]
    Removing,

    #[serde(rename = "dead")]
    Dead,

    #[serde(rename = "stopping")]
    Stopping,
}

impl From<String> for ContainerState {
    fn from(state: String) -> Self {
        match state.to_lowercase().as_str() {
            "empty" => ContainerState::Empty,
            "created" => ContainerState::Created,
            "running" => ContainerState::Running,
            "paused" => ContainerState::Paused,
            "restarting" => ContainerState::Restarting,
            "exited" => ContainerState::Exited,
            "removing" => ContainerState::Removing,
            "dead" => ContainerState::Dead,
            "stopping" => ContainerState::Stopping,
            _ => ContainerState::Empty,
        }
    }
}

impl From<bollard::models::ContainerSummaryStateEnum> for ContainerState {
    fn from(state: bollard::models::ContainerSummaryStateEnum) -> Self {
        use bollard::models::ContainerSummaryStateEnum as Bollard;

        match state {
            Bollard::EMPTY => ContainerState::Empty,
            Bollard::CREATED => ContainerState::Created,
            Bollard::RUNNING => ContainerState::Running,
            Bollard::PAUSED => ContainerState::Paused,
            Bollard::RESTARTING => ContainerState::Restarting,
            Bollard::EXITED => ContainerState::Exited,
            Bollard::REMOVING => ContainerState::Removing,
            Bollard::DEAD => ContainerState::Dead,
            Bollard::STOPPING => ContainerState::Stopping,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Container {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub names: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_id: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub ports: Option<Vec<Port>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_rw: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_root_fs: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub labels: Option<HashMap<String, String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<ContainerState>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub host_config: Option<ContainerHostConfig>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_settings: Option<ContainerNetworkSettings>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub mounts: Option<Vec<MountPoint>>,
}

impl From<ContainerSummary> for Container {
    fn from(container: ContainerSummary) -> Self {
        Container {
            id: container.id,
            names: container.names,
            image: container.image,
            image_id: container.image_id,
            command: container.command,
            created: container.created,
            ports: container
                .ports
                .map(|ports| ports.into_iter().map(|port| port.into()).collect()),
            size_rw: container.size_rw,
            size_root_fs: container.size_root_fs,
            labels: container.labels,
            state: container.state.map(|state| state.into()),
            status: container.status,
            host_config: container.host_config.map(|host_config| host_config.into()),
            network_settings: container
                .network_settings
                .map(|network_settings| network_settings.into()),
            mounts: container
                .mounts
                .map(|mounts| mounts.into_iter().map(|mount| mount.into()).collect()),
        }
    }
}
