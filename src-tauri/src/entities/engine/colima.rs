use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum ColimaArchitecture {
    #[serde(rename = "aarch64")]
    Aarch64,
    #[serde(rename = "x86_64")]
    X86_64,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ColimaVmType {
    Vz,
    Qemu,
    Krunkit,
    #[serde(other)]
    Other,
}

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
pub enum ColimaProfileStatus {
    Missing,
    Running,
    Stopped,
    Broken,
    #[serde(other)]
    Unknown,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct ColimaVmSettings {
    pub cpus: u32,
    pub memory_gib: f64,
    pub disk_gib: u32,
    pub architecture: ColimaArchitecture,
    pub vm_type: ColimaVmType,
    pub rosetta: bool,
    pub mount_inotify: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq)]
#[serde(default)]
pub struct ColimaVmSettingsChanges {
    pub cpus: Option<u32>,
    pub memory_gib: Option<f64>,
    pub disk_gib: Option<u32>,
    pub architecture: Option<ColimaArchitecture>,
    pub mount_inotify: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct ColimaHost {
    pub cpus: u32,
    pub memory_gib: f64,
    pub architecture: ColimaArchitecture,
    pub supports_vz: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct ColimaProfile {
    pub name: String,
    pub status: ColimaProfileStatus,
    pub settings: ColimaVmSettings,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
#[serde(tag = "kind")]
pub enum ColimaPerformanceWarning {
    FewCpus { cpus: u32 },
    RosettaOff,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct ColimaVm {
    pub profile: ColimaProfile,
    pub host: ColimaHost,
    pub warnings: Vec<ColimaPerformanceWarning>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn reads_the_settings_the_frontend_changed_and_leaves_the_rest_unset() {
        let changes: ColimaVmSettingsChanges = serde_json::from_value(json!({
            "cpus": 4,
            "memory_gib": 6,
            "architecture": "x86_64",
            "mount_inotify": true
        }))
        .expect("valid changes");

        assert_eq!(
            changes,
            ColimaVmSettingsChanges {
                cpus: Some(4),
                memory_gib: Some(6.0),
                disk_gib: None,
                architecture: Some(ColimaArchitecture::X86_64),
                mount_inotify: Some(true),
            }
        );
    }

    #[test]
    fn no_changes_is_an_empty_object() {
        let changes: ColimaVmSettingsChanges =
            serde_json::from_value(json!({})).expect("valid changes");

        assert_eq!(changes, ColimaVmSettingsChanges::default());
    }

    #[test]
    fn sends_the_vm_in_the_shape_the_frontend_reads() {
        let vm = ColimaVm {
            profile: ColimaProfile {
                name: "default".to_string(),
                status: ColimaProfileStatus::Running,
                settings: ColimaVmSettings {
                    cpus: 2,
                    memory_gib: 2.0,
                    disk_gib: 100,
                    architecture: ColimaArchitecture::Aarch64,
                    vm_type: ColimaVmType::Vz,
                    rosetta: false,
                    mount_inotify: false,
                },
            },
            host: ColimaHost {
                cpus: 12,
                memory_gib: 36.0,
                architecture: ColimaArchitecture::Aarch64,
                supports_vz: true,
            },
            warnings: vec![
                ColimaPerformanceWarning::FewCpus { cpus: 2 },
                ColimaPerformanceWarning::RosettaOff,
            ],
        };

        assert_eq!(
            serde_json::to_value(vm).expect("serializable"),
            json!({
                "profile": {
                    "name": "default",
                    "status": "Running",
                    "settings": {
                        "cpus": 2,
                        "memory_gib": 2.0,
                        "disk_gib": 100,
                        "architecture": "aarch64",
                        "vm_type": "vz",
                        "rosetta": false,
                        "mount_inotify": false
                    }
                },
                "host": {
                    "cpus": 12,
                    "memory_gib": 36.0,
                    "architecture": "aarch64",
                    "supports_vz": true
                },
                "warnings": [
                    { "kind": "FewCpus", "cpus": 2 },
                    { "kind": "RosettaOff" }
                ]
            })
        );
    }
}
