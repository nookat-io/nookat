use crate::entities::Engine;

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(not(target_os = "macos"))]
mod stub;

#[cfg(not(target_os = "macos"))]
pub use stub::*;


#[cfg(target_os = "macos")]
pub async fn create_engine() -> Result<Engine, String> {
    Ok(macos::create_engine().await?)
}

#[cfg(not(target_os = "macos"))]
pub async fn create_engine() -> Result<Engine, String> {
    let engine = stub::create_engine().await?;
}
