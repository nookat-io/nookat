use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct CreateContainerSpec {
    pub image: String,
    pub name: Option<String>,
    pub command: Option<Vec<String>>,
    pub entrypoint: Option<String>,
    pub working_dir: Option<String>,
    #[serde(default)]
    pub restart_policy: RestartPolicy,
    #[serde(default)]
    pub auto_remove: bool,
    #[serde(default)]
    pub ports: Vec<PortMapping>,
    #[serde(default)]
    pub mounts: Vec<StorageMount>,
    #[serde(default)]
    pub env: Vec<KeyValue>,
    #[serde(default)]
    pub labels: Vec<KeyValue>,
    pub network: Option<String>,
    pub cpus: Option<f64>,
    pub memory_mb: Option<u64>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "name", rename_all = "kebab-case")]
pub enum RestartPolicy {
    #[default]
    No,
    Always,
    UnlessStopped,
    OnFailure {
        maximum_retry_count: Option<u32>,
    },
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PortProtocol {
    #[default]
    Tcp,
    Udp,
    Sctp,
}

impl fmt::Display for PortProtocol {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            PortProtocol::Tcp => write!(f, "tcp"),
            PortProtocol::Udp => write!(f, "udp"),
            PortProtocol::Sctp => write!(f, "sctp"),
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct PortMapping {
    pub container_port: u16,
    #[serde(default)]
    pub protocol: PortProtocol,
    pub host_port: Option<u16>,
    pub host_ip: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum StorageMountKind {
    Volume,
    Bind,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StorageMount {
    pub kind: StorageMountKind,
    pub source: String,
    pub target: String,
    #[serde(default)]
    pub read_only: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct KeyValue {
    pub key: String,
    pub value: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CreatedContainer {
    pub id: String,
    pub started: bool,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum CreateContainerError {
    NotCreated { message: String },
    NotStarted { message: String, removed: bool },
}

impl fmt::Display for CreateContainerError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            CreateContainerError::NotCreated { message } => write!(f, "{message}"),
            CreateContainerError::NotStarted {
                message,
                removed: true,
            } => write!(f, "{message} (the container was removed again)"),
            CreateContainerError::NotStarted {
                message,
                removed: false,
            } => write!(f, "{message} (the container could not be removed)"),
        }
    }
}

impl From<String> for CreateContainerError {
    fn from(message: String) -> Self {
        CreateContainerError::NotCreated { message }
    }
}

impl From<&str> for CreateContainerError {
    fn from(message: &str) -> Self {
        message.to_string().into()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn a_spec_from_the_frontend_reads_its_restart_policy_by_name() {
        let spec: CreateContainerSpec = serde_json::from_value(json!({
            "image": "nginx:latest",
            "name": null,
            "command": null,
            "entrypoint": null,
            "working_dir": null,
            "restart_policy": { "name": "on-failure", "maximum_retry_count": 3 },
            "auto_remove": false,
            "ports": [{ "container_port": 80, "protocol": "udp", "host_port": null, "host_ip": null }],
            "mounts": [{ "kind": "bind", "source": "/srv", "target": "/data", "read_only": true }],
            "env": [{ "key": "MODE", "value": "dev" }],
            "labels": [],
            "network": null,
            "cpus": 1.5,
            "memory_mb": 512
        }))
        .expect("a valid spec");

        assert_eq!(
            spec.restart_policy,
            RestartPolicy::OnFailure {
                maximum_retry_count: Some(3)
            }
        );
        assert_eq!(spec.ports[0].protocol, PortProtocol::Udp);
        assert_eq!(spec.mounts[0].kind, StorageMountKind::Bind);
        assert_eq!(spec.cpus, Some(1.5));
    }

    #[test]
    fn a_restart_policy_without_retries_is_just_its_name() {
        let policy: RestartPolicy =
            serde_json::from_value(json!({ "name": "unless-stopped" })).expect("a policy");

        assert_eq!(policy, RestartPolicy::UnlessStopped);
    }

    #[test]
    fn a_failure_tells_the_frontend_whether_the_container_was_created() {
        let not_started = CreateContainerError::NotStarted {
            message: "port is already allocated".to_string(),
            removed: true,
        };

        assert_eq!(
            serde_json::to_value(&not_started).expect("serializable"),
            json!({ "kind": "not_started", "message": "port is already allocated", "removed": true })
        );
        assert_eq!(
            serde_json::to_value(CreateContainerError::from("Docker not found"))
                .expect("serializable"),
            json!({ "kind": "not_created", "message": "Docker not found" })
        );
    }
}
