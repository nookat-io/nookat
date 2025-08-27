use crate::entities::{Image, PruneResult};
use bollard::container::ListContainersOptions;
use bollard::image::{ListImagesOptions, RemoveImageOptions};
use bollard::models::ImageSummary;
use bollard::Docker;
use std::collections::{HashMap, HashSet};
use tracing::{debug, instrument};

#[derive(Default, Debug)]
pub struct ImagesService {}

impl ImagesService {
    /// Helper function to get all images and containers with used image IDs
    async fn get_images_and_used_ids(
        docker: &Docker,
    ) -> Result<(Vec<ImageSummary>, HashSet<String>), String> {
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

        debug!("Found {} containers using images", used_image_ids.len());

        Ok((images, used_image_ids))
    }

    #[instrument(skip_all, err)]
    pub async fn get_images(docker: &Docker) -> Result<Vec<Image>, String> {
        let (images, used_image_ids) = Self::get_images_and_used_ids(docker).await?;

        let result: Vec<Image> = images
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

        Ok(result)
    }

    #[instrument(skip_all, err)]
    pub async fn perform_prune(docker: &Docker) -> Result<PruneResult, String> {
        // By default Docker only prunes dangling (untagged) images.
        // We want to prune ALL unused images (equivalent to `docker image prune -a`).
        // Docker API achieves this by setting filter dangling=false.
        let mut filters: HashMap<String, Vec<String>> = HashMap::new();
        filters.insert("dangling".to_string(), vec!["false".to_string()]);

        let options = bollard::image::PruneImagesOptions::<String> { filters };

        let result = docker
            .prune_images(Some(options))
            .await
            .map_err(|e| format!("Failed to prune images: {}", e))?;

        // Convert ImageDeleteResponseItem to String
        let images_deleted = result
            .images_deleted
            .unwrap_or_default()
            .into_iter()
            .map(|item| item.deleted.unwrap_or_else(|| "unknown".to_string()))
            .collect();

        Ok(PruneResult {
            images_deleted,
            space_reclaimed: result.space_reclaimed.unwrap_or_default(),
        })
    }

    #[instrument(skip_all, err)]
    pub async fn delete_image(docker: &Docker, image_id: &str) -> Result<(), String> {
        debug!("Deleting image: {}", image_id);

        let options = RemoveImageOptions {
            force: false,
            noprune: false,
        };

        docker
            .remove_image(image_id, Some(options), None)
            .await
            .map_err(|e| format!("Failed to delete image {}: {}", image_id, e))?;

        debug!("Successfully deleted image: {}", image_id);
        Ok(())
    }
}
