mod i18n;
mod theme;
mod v1;
mod v2;

pub use i18n::*;
pub use theme::*;
pub use v1::*;
pub use v2::*;

use serde::{Deserialize, Serialize};

pub type AppConfig = AppConfigV2;

// Versioned config enum for backward compatibility
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "version")]
pub enum VersionedAppConfig {
    #[serde(rename = "1")]
    V1(AppConfigV1),
    #[serde(rename = "2")]
    V2(AppConfigV2),
}
