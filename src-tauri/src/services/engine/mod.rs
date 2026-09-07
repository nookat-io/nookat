use crate::entities::{Engine, EngineInfo, EngineStatus};
use crate::services::shell::is_docker_command_available;

use bollard::Docker;
use tauri::AppHandle;
use tracing::{debug, instrument, warn};

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "linux")]
pub use linux::*;

/// Whether this build manages a Colima VM itself.
///
/// Colima runs on macOS only. On every other platform Nookat attaches to a
/// daemon that something else started, so the install / start / stop flows do
/// not apply and must not be offered.
pub const COLIMA_MANAGED: bool = cfg!(target_os = "macos");

/// The answer the Colima install / start / stop entry points give on a platform
/// where Nookat does not manage Colima.
///
/// This is an `Err` and never a panic. These functions are called directly from
/// `#[tauri::command]` wrappers, and a panic inside a command aborts the task
/// the command runs in: the `invoke()` promise on the frontend never settles,
/// so the caller's `catch` never runs and the UI waits forever, while the
/// Sentry panic hook files the non-implementation as a crash.
#[cfg_attr(target_os = "macos", allow(dead_code))]
pub fn colima_unmanaged<T>() -> Result<T, String> {
    Err(format!(
        "Colima is only supported on macOS. On {} Nookat connects to a Docker daemon that is already running.",
        std::env::consts::OS
    ))
}

#[instrument(skip_all, err)]
async fn connect_to_docker_with_local_defaults() -> Result<Docker, String> {
    debug!("Trying to connect to Docker via local defaults");

    let docker = Docker::connect_with_local_defaults()
        .map_err(|e| format!("Failed to connect to Docker: {}", e))?;

    if docker.ping().await.is_ok() {
        debug!("Successfully connected to Docker via local defaults");
        return Ok(docker);
    }
    warn!("local defaults connection failed, trying fallback");
    Err("Failed to connect to Docker via local defaults".to_string())
}

#[instrument(skip_all, err)]
async fn connect_to_docker(app: &AppHandle) -> Result<Docker, String> {
    // First, attempt connecting via local defaults (honors DOCKER_HOST if set)
    if let Ok(docker) = connect_to_docker_with_local_defaults().await {
        return Ok(docker);
    }
    debug!("local defaults connection failed, trying fallback");

    // Try to get the current Docker context
    if let Ok(docker) = self::connect_to_docker_using_different_contexts(app).await {
        return Ok(docker);
    }
    debug!("context connection failed, trying fallback");

    Err("Failed to connect to Docker after local defaults and context-based attempts".to_string())
}

#[instrument(skip_all, err)]
pub async fn create_engine(app: &AppHandle) -> Result<Engine, String> {
    debug!("Creating an engine instance");

    let docker_available = match is_docker_command_available(app).await {
        Ok(v) => v,
        Err(e) => {
            debug!("Docker availability check failed: {}", e);
            false
        }
    };
    if !docker_available {
        debug!("Docker command is not available, creating an engine instance with unknown status");
        return Ok(Engine {
            engine_status: EngineStatus::Unknown,
            docker: None,
        });
    }

    if let Ok(docker) = connect_to_docker(app).await {
        debug!("Docker command is available, creating an engine instance with running status");
        return Ok(Engine {
            engine_status: EngineStatus::Running(EngineInfo::Docker),
            docker: Some(docker),
        });
    }

    Ok(Engine {
        engine_status: EngineStatus::Unknown,
        docker: None,
    })
}

/// Decide whether a stop request should actually issue `colima stop`.
///
/// Only a definitive "the VM is not running" answer justifies skipping the
/// stop. A failed status check falls through to attempting the stop, so an
/// unreadable status can never make the app report a stop it never performed.
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub fn should_stop_vm(status: &Result<bool, String>) -> bool {
    !matches!(status, Ok(false))
}

#[cfg(test)]
mod tests {
    use super::{colima_unmanaged, should_stop_vm, COLIMA_MANAGED};

    #[test]
    fn stops_when_the_vm_is_running() {
        assert!(should_stop_vm(&Ok(true)));
    }

    #[test]
    fn skips_the_stop_when_the_vm_is_not_running() {
        assert!(!should_stop_vm(&Ok(false)));
    }

    #[test]
    fn attempts_the_stop_when_the_status_check_fails() {
        assert!(should_stop_vm(&Err("colima not found".to_string())));
    }

    #[test]
    fn colima_is_managed_on_macos_only() {
        assert_eq!(COLIMA_MANAGED, cfg!(target_os = "macos"));
    }

    #[test]
    fn the_unmanaged_answer_is_an_error_and_names_both_platforms() {
        let message = colima_unmanaged::<()>().expect_err("must not be Ok");
        assert!(message.contains("macOS"), "{message}");
        assert!(message.contains(std::env::consts::OS), "{message}");
    }

    /// The install / start / stop entry points are called straight from
    /// `#[tauri::command]` wrappers. A panic inside a command aborts the task
    /// it runs in, so the `invoke()` promise never settles: the frontend's
    /// `catch` never runs, the UI waits on a reply that will not arrive, and
    /// the Sentry panic hook reports the missing implementation as a crash.
    /// Every one of those signatures returns `Result`, so an unsupported
    /// operation is an `Err`. Guard the whole backend against the pattern
    /// coming back.
    #[test]
    fn no_panicking_placeholders_in_services_or_handlers() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
        let mut offenders = Vec::new();

        let mut stack = vec![root.join("services"), root.join("handlers")];
        while let Some(path) = stack.pop() {
            let entries = std::fs::read_dir(&path).expect("readable source directory");
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    stack.push(path);
                    continue;
                }
                if path.extension().is_none_or(|ext| ext != "rs") {
                    continue;
                }
                let source = std::fs::read_to_string(&path).expect("readable source file");
                // Split so this scanner does not match its own source.
                let placeholders = [concat!("todo", "!("), concat!("unimplemented", "!(")];
                for (index, line) in source.lines().enumerate() {
                    if placeholders.iter().any(|p| line.contains(p)) {
                        offenders.push(format!("{}:{}", path.display(), index + 1));
                    }
                }
            }
        }

        assert!(
            offenders.is_empty(),
            "panicking placeholder reachable from a Tauri command: {}",
            offenders.join(", ")
        );
    }
}
