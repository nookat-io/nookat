use crate::entities::Engine;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(not(target_os = "macos"))]
mod stub;

#[cfg(not(target_os = "macos"))]
pub use stub::*;


pub async fn create_engine() -> Result<Engine, String> {
    #[cfg(target_os = "macos")]
    let engine = macos::create_engine().await?;

    #[cfg(not(target_os = "macos"))]
    let engine = stub::create_engine().await?;

    Ok(engine)
}
