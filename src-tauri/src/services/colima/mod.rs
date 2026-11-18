mod defaults;
mod docker_context;
mod host;
mod profile;
mod readiness;
mod start_args;
mod warnings;

pub use defaults::*;
pub use docker_context::*;
pub use host::*;
pub use profile::*;
pub use readiness::*;
pub use start_args::*;
pub use warnings::*;

const BYTES_PER_GIB: f64 = (1u64 << 30) as f64;

fn gib_from_bytes(bytes: u64) -> f64 {
    bytes as f64 / BYTES_PER_GIB
}
