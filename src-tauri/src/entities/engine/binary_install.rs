use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct BinaryComponent {
    pub name: String,
    pub version: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
pub struct BinaryInstallPlan {
    pub install_dir: String,
    pub bin_dir: String,
    pub components: Vec<BinaryComponent>,
    pub download_bytes: u64,
    pub installed_bytes: u64,
}
