use crate::entities::{
    DockerHubTag, Image, ImagePruneScope, ImagePullOutcome, ImagePullProgress, ImagePullRequest,
    PruneResult,
};
use crate::services::{ContainersService, ImagesService};
use crate::state::{RunningPulls, SharedEngineState};
use tauri::ipc::{Channel, JavaScriptChannelId};
use tauri::{State, Webview};
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn list_images(state: State<'_, SharedEngineState>) -> Result<Vec<Image>, String> {
    debug!("Listing images");
    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let containers = ContainersService::get_containers(docker).await?;
    ImagesService::get_images(docker, &containers).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn prune_images(
    state: State<'_, SharedEngineState>,
    scope: ImagePruneScope,
) -> Result<PruneResult, String> {
    debug!("Pruning images: {:?}", scope);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::perform_prune(docker, scope).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn delete_image(
    state: State<'_, SharedEngineState>,
    image_id: String,
) -> Result<(), String> {
    debug!("Deleting image: {}", image_id);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::delete_image(docker, &image_id).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn pull_image(
    state: State<'_, SharedEngineState>,
    running_pulls: State<'_, RunningPulls>,
    request: ImagePullRequest,
    on_progress: Option<JavaScriptChannelId>,
    webview: Webview,
) -> Result<ImagePullOutcome, String> {
    let running_pull = running_pulls.register(&request.pull_id);
    debug!(
        "Pulling image: {}:{} from registry: {}",
        request.image_name, request.tag, request.registry
    );

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    let progress_channel: Option<Channel<ImagePullProgress>> =
        on_progress.map(|channel| channel.channel_on(webview));
    ImagesService::pull_image(
        docker,
        &request.image_name,
        &request.tag,
        &request.registry,
        running_pull.cancelled(),
        |progress| {
            if let Some(channel) = &progress_channel {
                if let Err(e) = channel.send(progress) {
                    debug!("Could not send the pull progress: {}", e);
                }
            }
        },
    )
    .await
}

#[tauri::command]
#[instrument(skip_all)]
pub fn cancel_image_pull(running_pulls: State<'_, RunningPulls>, pull_id: String) -> bool {
    let cancelled = running_pulls.cancel(&pull_id);
    debug!("Cancel pull {}: {}", pull_id, cancelled);
    cancelled
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn search_docker_hub(query: String) -> Result<serde_json::Value, String> {
    debug!("Searching Docker Hub for: {}", query);
    ImagesService::search_docker_hub(&query).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn fetch_image_tags(
    image_name: String,
    name_filter: String,
) -> Result<Vec<String>, String> {
    debug!("Fetching tags for image: {}", image_name);
    ImagesService::fetch_image_tags(&image_name, &name_filter).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn fetch_image_tag(
    image_name: String,
    tag: String,
) -> Result<Option<DockerHubTag>, String> {
    debug!("Looking up tag {} of {}", tag, image_name);
    ImagesService::fetch_image_tag(&image_name, &tag).await
}
