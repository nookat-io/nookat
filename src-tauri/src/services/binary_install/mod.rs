mod download;
mod installer;
mod plan;
mod progress;
mod releases;
#[cfg(test)]
mod test_fixtures;
mod unpack;

pub use download::*;
pub use installer::*;
pub use plan::*;
pub use progress::*;
pub use releases::*;
pub use unpack::*;

use std::path::{Path, PathBuf};

pub fn engine_prefix(home: &Path) -> PathBuf {
    home.join(".nookat").join("engine")
}
