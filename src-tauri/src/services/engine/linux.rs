use crate::entities::{ColimaConfig, InstallationMethod};
use crate::services::engine::colima_unmanaged;
use crate::services::shell::get_docker_context_endpoints;
use bollard::Docker;
use tauri::AppHandle;
use tracing::{debug, instrument, warn};

// Nookat does not manage a container engine on Linux: it connects to the
// daemon the user already runs. These entry points exist so the shared
// `#[tauri::command]` wrappers compile on every platform, and they report the
// unsupported operation through the `Result` they already return. Returning an
// error rather than panicking is the whole point - see `colima_unmanaged`.

#[instrument(skip_all, err)]
pub async fn install_colima(_app: &AppHandle, _method: InstallationMethod) -> Result<(), String> {
    colima_unmanaged()
}

#[instrument(skip_all, err)]
pub async fn start_colima_vm(_app: &AppHandle, _config: ColimaConfig) -> Result<(), String> {
    colima_unmanaged()
}

#[instrument(skip_all, err)]
pub async fn stop_colima_vm(_app: &AppHandle) -> Result<(), String> {
    colima_unmanaged()
}

#[instrument(skip_all, err)]
pub async fn connect_to_docker_using_different_contexts(app: &AppHandle) -> Result<Docker, String> {
    debug!("Trying to connect to Docker via different contexts");

    let endpoints = get_docker_context_endpoints(app).await?;

    for socket_path in endpoints {
        if socket_path.starts_with("unix://") {
            let socket_path = socket_path.trim_start_matches("unix://");
            debug!("Current Docker context socket: {}", socket_path);

            if let Ok(docker) =
                Docker::connect_with_unix(socket_path, 5, bollard::API_DEFAULT_VERSION)
            {
                if docker.ping().await.is_ok() {
                    debug!("Successfully connected to Docker via context socket");
                    return Ok(docker);
                }
            }
        } else {
            warn!(
                "Current Docker context socket is not a Unix socket: {}",
                socket_path
            );
        }
    }

    Err("Failed to connect to Docker via context socket".to_string())
}
