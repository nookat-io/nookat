use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub enum Theme {
    #[serde(rename = "light")]
    Light,

    #[serde(rename = "dark")]
    Dark,

    #[serde(rename = "system")]
    #[default]
    System,
}
