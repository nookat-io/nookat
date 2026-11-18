mod defaults;
mod docker_context;
mod host;
mod profile;
mod readiness;
mod start_args;
mod warnings;

pub use defaults::*;

#[cfg(target_os = "macos")]
pub use self::{docker_context::*, host::*, profile::*, readiness::*, start_args::*, warnings::*};

const BYTES_PER_GIB: f64 = (1u64 << 30) as f64;

fn gib_from_bytes(bytes: u64) -> f64 {
    bytes as f64 / BYTES_PER_GIB
}
