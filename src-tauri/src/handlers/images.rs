use crate::entities::{Image, PruneResult};
use crate::services::{BuildOptions, ImagesService};
use crate::state::SharedEngineState;
use std::collections::HashMap;
use tauri::State;
use tracing::{debug, instrument};

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn list_images(state: State<'_, SharedEngineState>) -> Result<Vec<Image>, String> {
    debug!("Listing images");
    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::get_images(docker).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn prune_images(state: State<'_, SharedEngineState>) -> Result<PruneResult, String> {
    debug!("Pruning unused images");

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::perform_prune(docker).await
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
    image_name: String,
    registry: String,
) -> Result<(), String> {
    debug!("Pulling image: {} from registry: {}", image_name, registry);

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::pull_image(docker, &image_name, &registry).await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn build_image(
    state: State<'_, SharedEngineState>,
    dockerfile_path: String,
    build_context: String,
    image_name: String,
    build_args: HashMap<String, String>,
    options: BuildOptions,
) -> Result<(), String> {
    debug!(
        "Building image: {} from Dockerfile: {}",
        image_name, dockerfile_path
    );

    let engine = state.get_engine().await?;
    let docker = engine.docker.as_ref().ok_or("Docker not found")?;
    ImagesService::build_image(
        docker,
        &dockerfile_path,
        &build_context,
        &image_name,
        build_args,
        options,
    )
    .await
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn search_docker_hub(query: String) -> Result<serde_json::Value, String> {
    debug!("Searching Docker Hub for: {}", query);

    // Use reqwest to search Docker Hub API
    let client = reqwest::Client::new();
    let url = format!("https://index.docker.io/v1/search?q={}", query);

    let response = client
        .get(&url)
        .header("User-Agent", "Nookat/1.0")
        .send()
        .await
        .map_err(|e| format!("Failed to search Docker Hub: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "Docker Hub API returned status: {}",
            response.status()
        ));
    }

    let result = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Failed to parse Docker Hub response: {}", e))?;

    Ok(result)
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn check_docker_access() -> Result<bool, String> {
    debug!("Checking Docker daemon access");

    // Try to run a simple Docker command to check access
    let output = std::process::Command::new("docker")
        .args(["version", "--format", "{{.Client.Version}}"])
        .output()
        .map_err(|e| format!("Failed to execute Docker command: {}", e))?;

    Ok(output.status.success())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_docker_images_cli() -> Result<Vec<String>, String> {
    debug!("Getting Docker images via CLI");

    let output = std::process::Command::new("docker")
        .args([
            "images",
            "--format",
            "{{.ID}}\t{{.Repository}}\t{{.Tag}}\t{{.Digest}}\t{{.Size}}\t{{.CreatedAt}}",
        ])
        .output()
        .map_err(|e| format!("Failed to execute Docker command: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Docker command failed: {}", error));
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<String> = output_str.lines().map(|s| s.to_string()).collect();

    Ok(lines)
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn export_docker_image(image_name: String, output_path: String) -> Result<(), String> {
    debug!("Exporting Docker image: {} to {}", image_name, output_path);

    let output = std::process::Command::new("docker")
        .args(["save", &image_name, "-o", &output_path])
        .output()
        .map_err(|e| format!("Failed to execute Docker command: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to export image: {}", error));
    }

    Ok(())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn inspect_docker_image(image_name: String) -> Result<serde_json::Value, String> {
    debug!("Inspecting Docker image: {}", image_name);

    let output = std::process::Command::new("docker")
        .args(["inspect", &image_name])
        .output()
        .map_err(|e| format!("Failed to execute Docker command: {}", e))?;

    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to inspect image: {}", error));
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    let result: serde_json::Value = serde_json::from_str(&output_str)
        .map_err(|e| format!("Failed to parse inspect output: {}", e))?;

    Ok(result)
}
