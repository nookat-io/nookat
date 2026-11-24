use crate::entities::{
    BulkOutcome, Container, CreateContainerError, CreateContainerSpec, CreatedContainer,
};
use crate::services::{
    run_for_each_concurrently, shell, ContainerCreationService, ContainersService,
};
use crate::state::SharedEngineState;
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn list_containers(
    state: State<'_, SharedEngineState>,
) -> Result<Vec<Container>, String> {
    debug!("Listing containers");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let containers = ContainersService::get_containers(docker).await?;

    Ok(containers.into_iter().map(|c| c.into()).collect())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn create_container(
    state: State<'_, SharedEngineState>,
    spec: CreateContainerSpec,
    start: bool,
) -> Result<CreatedContainer, CreateContainerError> {
    debug!("Creating container from image: {}", spec.image);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainerCreationService::create(docker, &spec, start).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Starting container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::start_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn stop_container(state: State<'_, SharedEngineState>, id: String) -> Result<(), String> {
    debug!("Stopping container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::stop_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn pause_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Pausing container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::pause_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn unpause_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Unpausing container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::unpause_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn restart_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Restarting container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::restart_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_start_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<BulkOutcome, String> {
    debug!("Starting {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    Ok(run_for_each_concurrently(&ids, |id| ContainersService::start_container(docker, id)).await)
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_stop_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<BulkOutcome, String> {
    debug!("Stopping {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    Ok(run_for_each_concurrently(&ids, |id| ContainersService::stop_container(docker, id)).await)
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_pause_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<BulkOutcome, String> {
    debug!("Pausing {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    Ok(run_for_each_concurrently(&ids, |id| ContainersService::pause_container(docker, id)).await)
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_unpause_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<BulkOutcome, String> {
    debug!("Unpausing {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    Ok(
        run_for_each_concurrently(&ids, |id| ContainersService::unpause_container(docker, id))
            .await,
    )
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_restart_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<BulkOutcome, String> {
    debug!("Restarting {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    Ok(
        run_for_each_concurrently(&ids, |id| ContainersService::restart_container(docker, id))
            .await,
    )
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_remove_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<BulkOutcome, String> {
    debug!("Removing {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    Ok(run_for_each_concurrently(&ids, |id| ContainersService::remove_container(docker, id)).await)
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn bulk_force_remove_containers(
    state: State<'_, SharedEngineState>,
    ids: Vec<String>,
) -> Result<BulkOutcome, String> {
    debug!("Force removing {} containers", ids.len());

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    Ok(run_for_each_concurrently(&ids, |id| {
        ContainersService::force_remove_container(docker, id)
    })
    .await)
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn open_terminal(
    app: tauri::AppHandle,
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Opening terminal for container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let endpoint = engine.endpoint.as_deref().ok_or("Docker not found")?;

    let container_id = ContainersService::running_container_id(docker, &id).await?;
    let container_shell = ContainersService::interactive_shell(docker, &container_id).await?;

    shell::open_container_terminal(&app, endpoint, &container_id, container_shell).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn container_logs(
    state: State<'_, SharedEngineState>,
    id: String,
    lines: u32,
) -> Result<Vec<String>, String> {
    debug!("Getting the last {} log lines of container: {}", lines, id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::get_container_logs(docker, &id, lines).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn save_container_logs(
    window: tauri::WebviewWindow,
    file_name: String,
    lines: Vec<String>,
) -> Result<Option<String>, String> {
    debug!("Asking where to save {} log lines", lines.len());

    let (send_choice, choice) = tokio::sync::oneshot::channel();
    window
        .dialog()
        .file()
        .set_parent(&window)
        .set_file_name(file_name)
        .add_filter("Text", &["txt"])
        .save_file(move |path| {
            let _ = send_choice.send(path);
        });
    let Some(path) = choice
        .await
        .map_err(|_| "The save dialog closed without an answer")?
    else {
        return Ok(None);
    };
    let path = path.into_path().map_err(|e| e.to_string())?;
    ContainersService::save_logs(&path, &lines).await?;
    Ok(Some(path.display().to_string()))
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn remove_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Removing container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::remove_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn force_remove_container(
    state: State<'_, SharedEngineState>,
    id: String,
) -> Result<(), String> {
    debug!("Force removing container: {}", id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::force_remove_container(docker, &id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn prune_containers(state: State<'_, SharedEngineState>) -> Result<(), String> {
    debug!("Pruning containers");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ContainersService::prune_containers(docker).await
}
