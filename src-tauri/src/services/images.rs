use crate::entities::{Image, PruneResult};
use bollard::container::ListContainersOptions;
use bollard::image::ListImagesOptions;
use bollard::models::ImageSummary;
use bollard::Docker;
use std::collections::HashSet;

#[derive(Default, Debug)]
pub struct ImagesService {}

impl ImagesService {
    /// Helper function to connect to Docker
    async fn connect_docker() -> Result<Docker, String> {
        Docker::connect_with_local_defaults()
            .map_err(|e| format!("Failed to connect to Docker: {}", e))
    }

    /// Helper function to get all images and containers with used image IDs
    async fn get_images_and_used_ids() -> Result<(Vec<ImageSummary>, HashSet<String>), String> {
        let docker = Self::connect_docker().await?;

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
        let used_image_ids: HashSet<String> = containers
            .iter()
            .filter_map(|container| container.image_id.clone())
            .collect();

        println!("Found {} containers using images", used_image_ids.len());

        Ok((images, used_image_ids))
    }

    pub async fn get_images() -> Result<Vec<Image>, String> {
        let (images, used_image_ids) = Self::get_images_and_used_ids().await?;

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
                        image_tag = None;
                    }
                } else {
                    let id = image.id.clone();
                    if id.starts_with("sha256:") {
                        // For untagged images with SHA256 IDs, use a shortened version as name
                        // and indicate it's untagged rather than using a misleading tag
                        image_name = Some(format!(
                            "<untagged>@{}",
                            id.split(":").nth(1).unwrap_or("unknown")
                        ));
                        image_tag = None; // Keep as None to indicate no tag
                    } else {
                        image_name = Some(format!("<untagged>@{}", id));
                        image_tag = None; // Keep as None to indicate no tag
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

    pub async fn perform_prune() -> Result<PruneResult, String> {
        let (images, used_image_ids) = Self::get_images_and_used_ids().await?;
        let docker = Self::connect_docker().await?;

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
}
