use crate::entities::{EngineState, EngineStatus};
use crate::state::SharedDockerState;
use tauri::State;
use tracing::{instrument, debug};

/// Get the status of the container engine
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn engine_status(state: State<'_, SharedDockerState>) -> Result<EngineStatus, String> {
    debug!("Getting engine status");
    // Check if Docker is installed
    let docker = match state.get_docker().await {
        Ok(d) => d,
        Err(_) => {
            return Ok(EngineStatus {
                name: "Docker Engine".to_string(), // TODO: will be implemented in follow-up PR
                state: EngineState::NotInstalled,
                version: None,
                error: None,
            });
        }
    };

    debug!("Docker is installed");
    debug!("Pinging daemon");
    // Ping daemon, if fails assume it is not running
    if docker.ping().await.is_err() {
        state.return_docker(docker).await;
        return Ok(EngineStatus {
            name: "Docker Engine".to_string(), // TODO: will be implemented in follow-up PR
            state: EngineState::NotRunning,
            version: None,
            error: None,
        });
    }

    debug!("Daemon is running");
    debug!("Getting version");
    let version = match docker.version().await {
        Ok(v) => v.version,
        Err(e) => {
            state.return_docker(docker).await;
            return Ok(EngineStatus {
                name: "Docker Engine".to_string(), // TODO: will be implemented in follow-up PR
                state: EngineState::Malfunctioning,
                version: None,
                error: Some(format!("Could not get Docker version: {e}")),
            });
        }
    };

    debug!("Version: {:?}", version);

    state.return_docker(docker).await;
    // Installed, running and healthy
    Ok(EngineStatus {
        name: "Docker Engine".to_string(), // TODO: will be implemented in follow-up PR
        state: EngineState::Healthy,
        version,
        error: None,
    })
}
