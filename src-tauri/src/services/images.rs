use crate::entities::{Image, PruneResult};
use bollard::container::ListContainersOptions;
use bollard::image::{CreateImageOptions, ListImagesOptions, RemoveImageOptions};
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

    #[instrument(skip_all, err)]
    pub async fn pull_image(
        docker: &Docker,
        image_name: &str,
        registry: &str,
    ) -> Result<(), String> {
        debug!("Pulling image: {} from registry: {}", image_name, registry);

        // Construct the full image name
        let full_image_name = if registry != "docker.io" {
            if image_name.contains('/') {
                format!("{}/{}", registry, image_name)
            } else {
                format!("{}/{}", registry, image_name)
            }
        } else {
            image_name.to_string()
        };

        debug!("Full image name for pull: {}", full_image_name);

        // Create options for pulling the image
        let mut options = CreateImageOptions::default();
        options.from_image = full_image_name.clone();

        // For Docker Hub images, we might need to specify the tag
        if !full_image_name.contains(':') {
            options.tag = "latest".to_string();
        }

        debug!("Pull options: {:?}", options);

        // Test Docker connectivity first
        if let Err(e) = docker.ping().await {
            return Err(format!(
                "Docker connection failed: {}. Please ensure Docker is running and accessible.",
                e
            ));
        }

        debug!("Docker connection successful, attempting to pull image");

        // Pull the image using create_image (which is the correct API for pulling)
        let mut stream = docker.create_image(Some(options), None, None);

        use futures_util::StreamExt;

        let mut has_success = false;
        let mut last_error = None;
        let mut response_count = 0;

        while let Some(create_result) = stream.next().await {
            response_count += 1;
            debug!("Received response {}: {:?}", response_count, create_result);

            match create_result {
                Ok(create_info) => {
                    debug!("Pull response: {:?}", create_info);

                    if let Some(status) = create_info.status {
                        debug!("Pull status: {}", status);
                        if status.contains("Download complete")
                            || status.contains("Pull complete")
                            || status.contains("Status: Downloaded newer image")
                        {
                            has_success = true;
                        }
                    }

                    if let Some(id) = create_info.id {
                        debug!("Created image with ID: {}", id);
                        has_success = true;
                    }

                    if let Some(error) = create_info.error {
                        debug!("Pull error: {}", error);
                        last_error = Some(error);
                    }
                }
                Err(e) => {
                    debug!("Pull stream error: {}", e);
                    last_error = Some(e.to_string());
                }
            }
        }

        debug!(
            "Stream completed. Response count: {}, Has success: {}",
            response_count, has_success
        );

        if has_success {
            debug!("Successfully pulled image: {}", full_image_name);
            Ok(())
        } else if let Some(error) = last_error {
            Err(format!(
                "Failed to pull image {}: {}",
                full_image_name, error
            ))
        } else if response_count == 0 {
            Err(format!("Failed to pull image {}: No response from Docker. This might indicate a network issue or the image doesn't exist.", full_image_name))
        } else {
            Err(format!("Failed to pull image {}: Pull operation completed but no success indicators were found ({} responses received). The image might already exist or there was an issue during the pull process.", full_image_name, response_count))
        }
    }

    #[instrument(skip_all, err)]
    pub async fn build_image(
        docker: &Docker,
        dockerfile_path: &str,
        build_context: &str,
        image_name: &str,
        build_args: HashMap<String, String>,
        options: BuildOptions,
    ) -> Result<(), String> {
        debug!(
            "Building image: {} from Dockerfile: {}",
            image_name, dockerfile_path
        );

        // Create a tar archive of the build context
        let mut tar_builder = tar::Builder::new(Vec::new());

        // Add the Dockerfile to the tar
        let dockerfile_content = std::fs::read_to_string(dockerfile_path)
            .map_err(|e| format!("Failed to read Dockerfile: {}", e))?;

        let mut header = tar::Header::new_gnu();
        header
            .set_path("Dockerfile")
            .map_err(|e| format!("Failed to set Dockerfile path in tar: {}", e))?;
        header.set_size(dockerfile_content.len() as u64);
        header.set_mode(0o644);

        tar_builder
            .append(&header, dockerfile_content.as_bytes())
            .map_err(|e| format!("Failed to add Dockerfile to tar: {}", e))?;

        // Add build context files (simplified - in production you'd want to add the entire directory)
        let build_context_path = std::path::Path::new(build_context);
        if build_context_path.exists() && build_context_path.is_dir() {
            Self::add_directory_to_tar(&mut tar_builder, build_context_path, "")
                .map_err(|e| format!("Failed to add build context to tar: {}", e))?;
        }

        let _tar_data = tar_builder
            .into_inner()
            .map_err(|e| format!("Failed to finalize tar: {}", e))?;

        // Build the image
        let build_options = bollard::image::BuildImageOptions::<String> {
            dockerfile: "Dockerfile".to_string(),
            t: image_name.to_string(),
            buildargs: build_args,
            nocache: options.no_cache,
            pull: options.pull,
            ..Default::default()
        };

        let mut stream = docker.build_image(build_options, None, None);

        use futures_util::StreamExt;

        while let Some(build_result) = stream.next().await {
            match build_result {
                Ok(build_info) => {
                    if let Some(error) = build_info.error {
                        return Err(format!("Build error: {}", error));
                    }
                    if let Some(stream) = build_info.stream {
                        debug!("Build stream: {}", stream);
                    }
                }
                Err(e) => {
                    return Err(format!("Failed to build image: {}", e));
                }
            }
        }

        debug!("Successfully built image: {}", image_name);
        Ok(())
    }

    fn add_directory_to_tar(
        tar_builder: &mut tar::Builder<Vec<u8>>,
        dir_path: &std::path::Path,
        prefix: &str,
    ) -> Result<(), String> {
        for entry in
            std::fs::read_dir(dir_path).map_err(|e| format!("Failed to read directory: {}", e))?
        {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();
            let name = path
                .file_name()
                .ok_or("Invalid file name")?
                .to_str()
                .ok_or("Invalid file name encoding")?;

            let tar_name = if prefix.is_empty() {
                name.to_string()
            } else {
                format!("{}/{}", prefix, name)
            };

            if path.is_file() {
                let content =
                    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;

                let mut header = tar::Header::new_gnu();
                header
                    .set_path(&tar_name)
                    .map_err(|e| format!("Failed to set file path in tar: {}", e))?;
                header.set_size(content.len() as u64);
                header.set_mode(0o644);

                tar_builder
                    .append(&header, content.as_slice())
                    .map_err(|e| format!("Failed to add file to tar: {}", e))?;
            } else if path.is_dir() {
                Self::add_directory_to_tar(tar_builder, &path, &tar_name)?;
            }
        }
        Ok(())
    }
}

#[derive(Debug, serde::Deserialize)]
pub struct BuildOptions {
    pub no_cache: bool,
    pub pull: bool,
}
