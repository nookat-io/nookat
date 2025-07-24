use bollard::image::ListImagesOptions;
use bollard::container::ListContainersOptions;
use bollard::Docker;
use serde::{Deserialize, Serialize};

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

#[derive(Serialize, Deserialize, Debug)]
pub struct PruneResult {
    pub images_deleted: Vec<String>,
    pub space_reclaimed: i64,
}

async fn get_images() -> Result<Vec<Image>, String> {
    let docker = Docker::connect_with_local_defaults()
        .map_err(|e| format!("Failed to connect to Docker: {}", e))?;

    // Get all images
    let image_options: ListImagesOptions<String> = ListImagesOptions::default();
    let images = docker
        .list_images(Some(image_options))
        .await
        .map_err(|e| format!("Failed to list images: {}", e))?;

    // Get all containers to check which images are in use
    let container_options: ListContainersOptions<String> = ListContainersOptions {
        all: true,
        ..Default::default()
    };
    let containers = docker
        .list_containers(Some(container_options))
        .await
        .map_err(|e| format!("Failed to list containers: {}", e))?;

    // Create a set of image IDs that are currently in use
    let used_image_ids: std::collections::HashSet<String> = containers
        .iter()
        .filter_map(|container| container.image_id.clone())
        .collect();

    println!("Found {} containers using images", used_image_ids.len());

    let result: Vec<Image> = images
        .iter()
        .map(|image| {
            let mut image_name = None;
            let mut image_tag = None;

            if image.repo_tags.len() > 0 {
                let tag_full = image.repo_tags[0].clone();
                let parts: Vec<&str> = tag_full.splitn(2, ':').collect();

                if parts.len() == 2 {
                    image_name = Some(parts[0].to_string());
                    image_tag = Some(parts[1].to_string());
                } else if parts.len() == 1 {
                    // Handle case where there's no tag (just repository name)
                    image_name = Some(parts[0].to_string());
                    image_tag = Some("latest".to_string());
                }
            } else {
                let id = image.id.clone();
                if id.starts_with("sha256:") {
                    image_name = Some(id.split(":").nth(1).unwrap_or("unknown").to_string());
                    image_tag = Some("unknown".to_string());
                } else {
                    image_name = Some(id);
                    image_tag = Some("unknown".to_string());
                }
            }

            // Check if this image is in use by any container
            let in_use = used_image_ids.contains(&image.id);

            Image {
                id: image.id.clone(),
                repository: image_name,
                tag: image_tag,
                image_id: image.id.clone(),
                created: image.created,
                size: image.size,
                in_use,
            }
        })
        .collect();

    println!("Processed {} images", result.len());
    Ok(result)
}

async fn perform_prune() -> Result<PruneResult, String> {
    let docker = Docker::connect_with_local_defaults()
        .map_err(|e| format!("Failed to connect to Docker: {}", e))?;

    // Get all images
    let image_options: ListImagesOptions<String> = ListImagesOptions::default();
    let images = docker
        .list_images(Some(image_options))
        .await
        .map_err(|e| format!("Failed to list images: {}", e))?;

    // Get all containers to identify unused images
    let container_options: ListContainersOptions<String> = ListContainersOptions {
        all: true,
        ..Default::default()
    };
    let containers = docker
        .list_containers(Some(container_options))
        .await
        .map_err(|e| format!("Failed to list containers: {}", e))?;

    // Create a set of image IDs that are currently in use
    let used_image_ids: std::collections::HashSet<String> = containers
        .iter()
        .filter_map(|container| container.image_id.clone())
        .collect();

    let mut deleted_images = Vec::new();
    let mut total_space_reclaimed = 0i64;

    // Find and delete unused images
    for image in images {
        if !used_image_ids.contains(&image.id) {
            match docker.remove_image(&image.id, None, None).await {
                Ok(_) => {
                    deleted_images.push(image.id.clone());
                    total_space_reclaimed += image.size;
                    println!("Deleted image: {}", image.id);
                }
                Err(e) => {
                    println!("Failed to delete image {}: {}", image.id, e);
                }
            }
        }
    }

    Ok(PruneResult {
        images_deleted: deleted_images,
        space_reclaimed: total_space_reclaimed,
    })
}

#[tauri::command]
pub async fn list_images() -> Result<Vec<Image>, String> {
    println!("Listing images");
    get_images().await
}

#[tauri::command]
pub async fn prune_images() -> Result<PruneResult, String> {
    println!("Pruning unused images");
    perform_prune().await
}
