use crate::entities::containers::{ContainerNetworkSettings, MountPoint, Port};
use bollard::secret::ContainerSummary;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Summary of host-specific runtime information of the container.
/// This is a reduced set of information in the container's \"HostConfig\" as available in the container \"inspect\" response.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ContainerHostConfig {
    /// Networking mode (`host`, `none`, `container:<id>`) or name of the primary network the container is using.
    /// This field is primarily for backward compatibility. The container can be connected to multiple networks for
    /// which information can be found in the `NetworkSettings.Networks` field, which enumerates settings per network.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_mode: Option<String>,

    /// Arbitrary key-value metadata attached to the container.
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
            _ => ContainerState::Empty,
        }
    }
}

// impl From<bollard::models::ContainerSummaryStateEnum> for ContainerState {
//     fn from(state: bollard::models::ContainerSummaryStateEnum) -> Self {
//         match state {
//             bollard::models::ContainerSummaryStateEnum::EMPTY => ContainerState::EMPTY,
//             bollard::models::ContainerSummaryStateEnum::CREATED => ContainerState::CREATED,
//             bollard::models::ContainerSummaryStateEnum::RUNNING => ContainerState::RUNNING,
//             bollard::models::ContainerSummaryStateEnum::PAUSED => ContainerState::PAUSED,
//             bollard::models::ContainerSummaryStateEnum::RESTARTING => ContainerState::RESTARTING,
//             bollard::models::ContainerSummaryStateEnum::EXITED => ContainerState::EXITED,
//             bollard::models::ContainerSummaryStateEnum::REMOVING => ContainerState::REMOVING,
//             bollard::models::ContainerSummaryStateEnum::DEAD => ContainerState::DEAD,
//         }
//     }
// }

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Container {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,

    /// The names associated with this container.
    /// Most containers have a single name, but when using legacy \"links\",
    /// the container can have multiple names.  For historic reasons, names are prefixed with a forward-slash (`/`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub names: Option<Vec<String>>,

    /// The name or ID of the image used to create the container.
    /// This field shows the image reference as was specified when creating the container,
    /// which can be in its canonical form (e.g., `docker.io/library/ubuntu:latest` or
    /// `docker.io/library/ubuntu@sha256:72297848456d5d37d1262630108ab308d3e9ec7ed1c3286a32fe09856619a782`),
    /// short form (e.g., `ubuntu:latest`)), or the ID(-prefix) of the image (e.g., `72297848456d`).
    /// The content of this field can be updated at runtime if the image used to create the container is untagged,
    /// in which case the field is updated to contain the the image ID (digest) it was resolved to in its canonical,
    /// non-truncated form (e.g., `sha256:72297848456d5d37d1262630108ab308d3e9ec7ed1c3286a32fe09856619a782`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image: Option<String>,

    /// The ID (digest) of the image that this container was created from.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub image_id: Option<String>,

    // OCI descriptor of the platform-specific manifest of the image the container was created from.
    // Note: Only available if the daemon provides a multi-platform image store.
    // This field is not populated in the `GET /system/df` endpoint.
    // #[serde(skip_serializing_if = "Option::is_none")]
    // pub image_manifest_descriptor: Option<OciDescriptor>,
    /// Command to run when starting the container
    #[serde(skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,

    /// Date and time at which the container was created as a Unix timestamp (number of seconds since EPOCH).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created: Option<i64>,

    /// Port-mappings for the container.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ports: Option<Vec<Port>>,

    /// The size of files that have been created or changed by this container.
    /// This field is omitted by default, and only set when size is requested in the API request.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_rw: Option<i64>,

    /// The total size of all files in the read-only layers from the image that the container uses.
    /// These layers can be shared between containers.
    /// This field is omitted by default, and only set when size is requested in the API request.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size_root_fs: Option<i64>,

    /// User-defined key/value metadata.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub labels: Option<HashMap<String, String>>,

    /// The state of this container.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub state: Option<ContainerState>,

    /// Additional human-readable status of this container (e.g. `Exit 0`)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub host_config: Option<ContainerHostConfig>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_settings: Option<ContainerNetworkSettings>,

    /// List of mounts used by the container.
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
            // image_manifest_descriptor: container
            //     .image_manifest_descriptor
            //     .map(|descriptor| descriptor.into()),
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
