use bollard::image::ListImagesOptions;
use bollard::Docker;
use serde::{Deserialize, Serialize};
use crate::{AppError, AppResult};
use crate::services::DockerService;
use log::{info, error, debug};

#[derive(Serialize, Deserialize, Debug)]
pub struct Image {
    pub id: String,
    pub repository: Option<String>,
    pub tag: Option<String>,
    pub image_id: String,
    pub created: i64,
    pub size: i64,
    pub in_use: bool,
}

async fn get_images() -> AppResult<Vec<Image>> {
    let docker = DockerService::connect()?;

    let options: ListImagesOptions<String> = ListImagesOptions::default();

    info!("Fetching Docker images");
    let images = docker
        .list_images(Some(options))
        .await
        .map_err(|e| {
            error!("Failed to list images: {}", e);
            AppError::DockerConnection(e)
        })?;

    let processed_images: Vec<Image> = images
        .iter()
        .map(|image| {
            let mut image_name = None;
            let mut image_tag = None;

            if !image.repo_tags.is_empty() {
                let tag_full = image.repo_tags[0].clone();
                let parts: Vec<&str> = tag_full.splitn(2, ':').collect();

                if parts.len() == 2 {
                    image_name = Some(parts[0].to_string());
                    image_tag = Some(parts[1].to_string());
                } else if parts.len() == 1 {
                    // Handle case where there's no tag (just repository name)
                    image_name = Some(parts[0].to_string());
                    image_tag = Some("latest".to_string()); // Use "latest" instead of "unknown"
                }
            } else {
                // Handle untagged images
                let id = image.id.clone();
                if let Some(short_id) = id.strip_prefix("sha256:") {
                    // Take first 12 characters of SHA for display
                    image_name = Some(format!("<none>"));
                    image_tag = Some(short_id.chars().take(12).collect());
                } else {
                    image_name = Some("<none>".to_string());
                    image_tag = Some("unknown".to_string());
                }
            }

            Image {
                id: image.id.clone(),
                repository: image_name,
                tag: image_tag,
                image_id: image.id.clone(),
                created: image.created,
                size: image.size,
                in_use: false, // TODO: Implement actual usage detection
            }
        })
        .collect();

    debug!("Found {} images", processed_images.len());
    Ok(processed_images)
}

#[tauri::command]
pub async fn list_images() -> Result<Vec<Image>, AppError> {
    info!("Listing images");
    let images = get_images().await?;
    info!("Successfully listed {} images", images.len());
    Ok(images)
}
