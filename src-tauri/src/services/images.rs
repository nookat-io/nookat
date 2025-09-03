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
        tag: &str,
        registry: &str,
    ) -> Result<(), String> {
        debug!(
            "Pulling image: {}:{} from registry: {}",
            image_name, tag, registry
        );

        // Construct the full image name with tag
        let full_image_name = if registry != "docker.io" {
            format!("{}/{}:{}", registry, image_name, tag)
        } else {
            format!("{}:{}", image_name, tag)
        };

        debug!("Full image name for pull: {}", full_image_name);

        // Create options for pulling the image
        let mut options = CreateImageOptions::default();
        options.from_image = full_image_name.clone();

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
    pub async fn search_docker_hub(query: &str) -> Result<serde_json::Value, String> {
        debug!("Searching Docker Hub for: {}", query);

        // Create reqwest client with timeout to avoid hanging
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        // Use Docker Hub v2 search endpoint with page_size and proper URL encoding
        let url = format!(
            "https://hub.docker.com/v2/search/repositories/?query={}&page_size=25",
            query
                .replace(' ', "%20")
                .replace('&', "%26")
                .replace('?', "%3F")
        );

        let response = client
            .get(&url)
            .header("User-Agent", "Nookat/1.0")
            .send()
            .await
            .map_err(|e| format!("Failed to search Docker Hub v2 API: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "Docker Hub v2 API returned status: {}",
                response.status()
            ));
        }

        let raw = response
            .json::<serde_json::Value>()
            .await
            .map_err(|e| format!("Failed to parse Docker Hub v2 response: {}", e))?;

        // Normalize Docker Hub v2 search response to { results: DockerHubImage[] }
        // Expected fields in frontend: name, description, star_count, pull_count, is_official, is_automated
        let mut normalized_results: Vec<serde_json::Value> = Vec::new();
        if let Some(items) = raw.get("results").and_then(|v| v.as_array()) {
            for item in items {
                let name = item
                    .get("repo_name")
                    .and_then(|v| v.as_str())
                    .or_else(|| item.get("name").and_then(|v| v.as_str()))
                    .or_else(|| item.get("slug").and_then(|v| v.as_str()))
                    .unwrap_or("")
                    .to_string();

                let description = item
                    .get("short_description")
                    .and_then(|v| v.as_str())
                    .or_else(|| item.get("description").and_then(|v| v.as_str()))
                    .unwrap_or("")
                    .to_string();

                let star_count =
                    item.get("star_count").and_then(|v| v.as_u64()).unwrap_or(0) as i64;

                let pull_count =
                    item.get("pull_count").and_then(|v| v.as_u64()).unwrap_or(0) as i64;

                let is_official = item
                    .get("is_official")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                let is_automated = item
                    .get("is_automated")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                // Only include entries that have a non-empty name
                if !name.is_empty() {
                    normalized_results.push(serde_json::json!({
                        "name": name,
                        "description": description,
                        "star_count": star_count,
                        "pull_count": pull_count,
                        "is_official": is_official,
                        "is_automated": is_automated,
                    }));
                }
            }
        }

        Ok(serde_json::json!({ "results": normalized_results }))
    }

    #[instrument(skip_all, err)]
    pub async fn fetch_image_tags(image_name: &str) -> Result<Vec<String>, String> {
        debug!("Fetching tags for image: {}", image_name);

        // Ensure image_name uses the namespace form by prefixing "library/" when there is no namespace
        let namespace_image = if image_name.contains('/') {
            image_name.to_string()
        } else {
            format!("library/{}", image_name)
        };

        // Create reqwest client with timeout to avoid hanging
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        let mut all_tags = Vec::new();
        let mut next_url = Some(format!(
            "https://registry.hub.docker.com/v2/repositories/{}/tags?page_size=100",
            namespace_image
        ));

        // Handle pagination by looping through all pages
        while let Some(url) = next_url {
            debug!("Fetching tags from: {}", url);

            let response = client
                .get(&url)
                .header("User-Agent", "Nookat/1.0")
                .send()
                .await
                .map_err(|e| format!("Failed to fetch tags for {}: {}", image_name, e))?;

            if !response.status().is_success() {
                return Err(format!(
                    "Docker Hub API returned status: {} for image: {}",
                    response.status(),
                    image_name
                ));
            }

            let result = response
                .json::<serde_json::Value>()
                .await
                .map_err(|e| format!("Failed to parse Docker Hub tags response: {}", e))?;

            // Extract tag names from the current page
            if let Some(results) = result.get("results").and_then(|r| r.as_array()) {
                let page_tags: Vec<String> = results
                    .iter()
                    .filter_map(|tag| tag.get("name").and_then(|name| name.as_str()))
                    .map(|name| name.to_string())
                    .collect();

                all_tags.extend(page_tags);
            }

            // Check for next page URL
            next_url = result
                .get("next")
                .and_then(|next| next.as_str())
                .map(|s| s.to_string());
        }

        debug!("Found {} tags for image: {}", all_tags.len(), image_name);
        Ok(all_tags)
    }
}
