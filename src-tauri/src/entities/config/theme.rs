use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Copy)]
pub enum Theme {
    #[serde(rename = "light")]
    Light,

    #[serde(rename = "dark")]
    Dark,

    #[serde(rename = "system")]
    #[default]
    System,
}

impl Theme {
    pub fn as_str(&self) -> &'static str {
        match self {
            Theme::Light => "light",
            Theme::Dark => "dark",
            Theme::System => "system",
        }
    }
}
