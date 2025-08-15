use crate::entities::EngineStatus;
use crate::state::SharedEngineState;
use tauri::State;
use tracing::{debug, info, instrument};

/// Get the status of the container engine
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn engine_status(state: State<'_, SharedEngineState>) -> Result<EngineStatus, String> {
    info!("Getting engine status");

    let engine = state.get_engine().await?;
    let status = engine.engine_status.clone();
    info!("Engine status: {:?}", status);
    state.return_engine(engine).await;
    Ok(status)

    // // Check if Docker is installed
    // let docker = match state.get_docker().await {
    //     Ok(d) => d,
    //     Err(_) => {
    //         return Ok(EngineStatus {
    //             name: "Docker Engine".to_string(), // TODO: will be implemented in follow-up PR
    //             state: EngineState::NotInstalled,
    //             version: None,
    //             error: None,
    //         });
    //     }
    // };

    // debug!("Docker is installed");
    // debug!("Pinging daemon");
    // // Ping daemon, if fails assume it is not running
    // if docker.ping().await.is_err() {
    //     state.return_docker(docker).await;
    //     return Ok(EngineStatus {
    //         name: "Docker Engine".to_string(), // TODO: will be implemented in follow-up PR
    //         state: EngineState::NotRunning,
    //         version: None,
    //         error: None,
    //     });
    // }

    // debug!("Daemon is running");
    // debug!("Getting version");
    // let version = match docker.version().await {
    //     Ok(v) => v.version,
    //     Err(e) => {
    //         state.return_docker(docker).await;
    //         return Ok(EngineStatus {
    //             name: "Docker Engine".to_string(), // TODO: will be implemented in follow-up PR
    //             state: EngineState::Malfunctioning,
    //             version: None,
    //             error: Some(format!("Could not get Docker version: {e}")),
    //         });
    //     }
    // };

    // debug!("Version: {:?}", version);

    // state.return_docker(docker).await;
    // // Installed, running and healthy
    // Ok(EngineStatus {
    //     name: "Docker Engine".to_string(), // TODO: will be implemented in follow-up PR
    //     state: EngineState::Healthy,
    //     version,
    //     error: None,
    // })
}
