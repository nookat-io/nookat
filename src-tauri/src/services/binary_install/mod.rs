mod download;
mod installer;
mod plan;
mod progress;
mod releases;
#[cfg(test)]
mod test_fixtures;
mod unpack;

#[cfg(target_os = "macos")]
pub use self::{plan::*, progress::*};
pub use download::*;
pub use installer::*;
pub use releases::*;
pub use unpack::*;

#[cfg(target_os = "macos")]
pub fn engine_prefix(home: &std::path::Path) -> std::path::PathBuf {
    home.join(".nookat").join("engine")
}
