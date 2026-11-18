use crate::entities::{Image, PruneResult};
use bollard::models::ImageSummary;
use bollard::query_parameters::{
    CreateImageOptions, ListContainersOptions, ListImagesOptions, PruneImagesOptions,
    RemoveImageOptions,
};
use bollard::Docker;
use futures_util::StreamExt;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::time::Duration;
use tracing::{debug, instrument};

const DOCKER_HUB_REGISTRY: &str = "docker.io";
const DOCKER_HUB_SEARCH_URL: &str = "https://hub.docker.com/v2/search/repositories/";
const DOCKER_HUB_SEARCH_PAGE_SIZE: &str = "25";
const DOCKER_HUB_TIMEOUT: Duration = Duration::from_secs(15);
const DOCKER_HUB_USER_AGENT: &str = "Nookat/1.0";

#[derive(Default, Debug)]
pub struct ImagesService {}

impl ImagesService {
    async fn get_images_and_used_ids(
        docker: &Docker,
    ) -> Result<(Vec<ImageSummary>, HashSet<String>), String> {
        let image_options = ListImagesOptions::default();
        let images = docker
            .list_images(Some(image_options))
            .await
            .map_err(|e| format!("Failed to list images: {}", e))?;

        let container_options = ListContainersOptions {
            all: true,
            ..Default::default()
        };
        let containers = docker
            .list_containers(Some(container_options))
            .await
            .map_err(|e| format!("Failed to list containers: {}", e))?;

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

        Ok(images
            .iter()
            .map(|summary| to_image(summary, &used_image_ids))
            .collect())
    }

    #[instrument(skip_all, err)]
    pub async fn perform_prune(docker: &Docker) -> Result<PruneResult, String> {
        let result = docker
            .prune_images(Some(every_unused_image()))
            .await
            .map_err(|e| format!("Failed to prune images: {}", e))?;

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
            ..Default::default()
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

        let full_image_name = full_image_reference(image_name, tag, registry);
        debug!("Full image name for pull: {}", full_image_name);

        if let Err(e) = docker.ping().await {
            return Err(format!(
                "Docker connection failed: {}. Please ensure Docker is running and accessible.",
                e
            ));
        }

        let options = CreateImageOptions {
            from_image: Some(full_image_name.clone()),
            ..Default::default()
        };
        let mut pull_progress = docker.create_image(Some(options), None, None);

        while let Some(progress) = pull_progress.next().await {
            let progress =
                progress.map_err(|e| format!("Failed to pull image {}: {}", full_image_name, e))?;
            debug!("Pull progress: {:?}", progress);
        }

        debug!("Successfully pulled image: {}", full_image_name);
        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn search_docker_hub(query: &str) -> Result<Value, String> {
        debug!("Searching Docker Hub for: {}", query);

        let response = docker_hub_client()?
            .get(DOCKER_HUB_SEARCH_URL)
            .query(&[("query", query), ("page_size", DOCKER_HUB_SEARCH_PAGE_SIZE)])
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
            .json::<Value>()
            .await
            .map_err(|e| format!("Failed to parse Docker Hub v2 response: {}", e))?;

        let results: Vec<Value> = raw
            .get("results")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(to_search_result)
            .collect();

        Ok(serde_json::json!({ "results": results }))
    }

    #[instrument(skip_all, err)]
    pub async fn fetch_image_tags(image_name: &str) -> Result<Vec<String>, String> {
        debug!("Fetching tags for image: {}", image_name);

        let client = docker_hub_client()?;

        let mut all_tags = Vec::new();
        let mut next_page_url = Some(format!(
            "https://registry.hub.docker.com/v2/repositories/{}/tags?page_size=100",
            docker_hub_repository(image_name)
        ));

        while let Some(url) = next_page_url {
            debug!("Fetching tags from: {}", url);

            let response = client
                .get(&url)
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

            let page = response
                .json::<Value>()
                .await
                .map_err(|e| format!("Failed to parse Docker Hub tags response: {}", e))?;

            if let Some(results) = page.get("results").and_then(|r| r.as_array()) {
                all_tags.extend(
                    results
                        .iter()
                        .filter_map(|tag| tag.get("name").and_then(|name| name.as_str()))
                        .map(|name| name.to_string()),
                );
            }

            next_page_url = page
                .get("next")
                .and_then(|next| next.as_str())
                .map(|s| s.to_string());
        }

        debug!("Found {} tags for image: {}", all_tags.len(), image_name);
        Ok(all_tags)
    }
}

fn every_unused_image() -> PruneImagesOptions {
    PruneImagesOptions {
        filters: Some(HashMap::from([(
            "dangling".to_string(),
            vec!["false".to_string()],
        )])),
    }
}

fn full_image_reference(image_name: &str, tag: &str, registry: &str) -> String {
    if registry == DOCKER_HUB_REGISTRY {
        format!("{}:{}", image_name, tag)
    } else {
        format!("{}/{}:{}", registry, image_name, tag)
    }
}

fn docker_hub_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(DOCKER_HUB_TIMEOUT)
        .user_agent(DOCKER_HUB_USER_AGENT)
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))
}

fn docker_hub_repository(image_name: &str) -> String {
    if image_name.contains('/') {
        image_name.to_string()
    } else {
        format!("library/{}", image_name)
    }
}

fn to_search_result(item: &Value) -> Option<Value> {
    let text = |field: &str| item.get(field).and_then(Value::as_str);
    let count = |field: &str| item.get(field).and_then(Value::as_u64).unwrap_or(0) as i64;
    let flag = |field: &str| item.get(field).and_then(Value::as_bool).unwrap_or(false);

    let name = text("repo_name")
        .or_else(|| text("name"))
        .or_else(|| text("slug"))
        .filter(|name| !name.is_empty())?;

    let description = text("short_description")
        .or_else(|| text("description"))
        .unwrap_or("");

    Some(serde_json::json!({
        "name": name,
        "description": description,
        "star_count": count("star_count"),
        "pull_count": count("pull_count"),
        "is_official": flag("is_official"),
        "is_automated": flag("is_automated"),
    }))
}

const UNTAGGED_REFERENCE: &str = "<none>:<none>";

fn to_image(summary: &ImageSummary, used_image_ids: &HashSet<String>) -> Image {
    let reference = summary
        .repo_tags
        .iter()
        .find(|reference| reference.as_str() != UNTAGGED_REFERENCE);
    let (repository, tag) = match reference {
        Some(reference) => split_reference(reference),
        None => (untagged_repository(summary), None),
    };

    Image {
        id: summary.id.clone(),
        repository: Some(repository),
        tag,
        image_id: summary.id.clone(),
        created: summary.created,
        size: summary.size,
        in_use: used_image_ids.contains(&summary.id),
        dangling: reference.is_none(),
    }
}

fn split_reference(reference: &str) -> (String, Option<String>) {
    match reference.rsplit_once(':') {
        Some((repository, tag)) if !tag.contains('/') => {
            (repository.to_string(), Some(tag.to_string()))
        }
        _ => (reference.to_string(), None),
    }
}

fn untagged_repository(summary: &ImageSummary) -> String {
    summary
        .repo_digests
        .iter()
        .filter_map(|digest| digest.rsplit_once('@'))
        .map(|(repository, _)| repository)
        .find(|repository| *repository != "<none>")
        .map(str::to_string)
        .unwrap_or_else(|| {
            let id = summary.id.strip_prefix("sha256:").unwrap_or(&summary.id);
            format!("<untagged>@{id}")
        })
}

#[cfg(test)]
mod tests {
    use super::{
        docker_hub_repository, every_unused_image, full_image_reference, split_reference, to_image,
        to_search_result,
    };
    use bollard::models::ImageSummary;
    use serde_json::json;
    use std::collections::HashSet;

    fn summary(id: &str, repo_tags: &[&str]) -> ImageSummary {
        ImageSummary {
            id: id.to_string(),
            repo_tags: repo_tags.iter().map(|tag| tag.to_string()).collect(),
            ..Default::default()
        }
    }

    fn pulled_then_untagged(id: &str, repo_digests: &[&str]) -> ImageSummary {
        ImageSummary {
            repo_digests: repo_digests
                .iter()
                .map(|digest| digest.to_string())
                .collect(),
            ..summary(id, &[])
        }
    }

    fn reference(repository: &str, tag: Option<&str>) -> (String, Option<String>) {
        (repository.to_string(), tag.map(str::to_string))
    }

    #[test]
    fn splits_a_reference_at_the_tag_separator() {
        assert_eq!(
            split_reference("nginx:1.27"),
            reference("nginx", Some("1.27"))
        );
        assert_eq!(
            split_reference("ghcr.io/org/app:latest"),
            reference("ghcr.io/org/app", Some("latest"))
        );
    }

    #[test]
    fn keeps_a_registry_port_in_the_repository() {
        assert_eq!(
            split_reference("localhost:5000/app:1.0"),
            reference("localhost:5000/app", Some("1.0"))
        );
        assert_eq!(
            split_reference("localhost:5000/app"),
            reference("localhost:5000/app", None)
        );
    }

    #[test]
    fn a_tagged_image_is_not_dangling_even_when_unused() {
        let image = to_image(&summary("sha256:abc", &["postgres:18"]), &HashSet::new());

        assert!(!image.dangling);
        assert!(!image.in_use);
        assert_eq!(image.repository.as_deref(), Some("postgres"));
        assert_eq!(image.tag.as_deref(), Some("18"));
    }

    #[test]
    fn an_image_without_tags_is_dangling() {
        let image = to_image(&summary("sha256:abc", &[]), &HashSet::new());

        assert!(image.dangling);
        assert_eq!(image.repository.as_deref(), Some("<untagged>@abc"));
        assert_eq!(image.tag, None);
    }

    #[test]
    fn an_image_tagged_none_by_an_older_daemon_is_dangling() {
        let image = to_image(&summary("sha256:abc", &["<none>:<none>"]), &HashSet::new());

        assert!(image.dangling);
        assert_eq!(image.repository.as_deref(), Some("<untagged>@abc"));
    }

    #[test]
    fn an_untagged_image_keeps_the_repository_it_was_pulled_from() {
        let image = to_image(
            &pulled_then_untagged(
                "sha256:abc",
                &[
                    "localhost:5000/app@sha256:0123",
                    "ghcr.io/org/app@sha256:4567",
                ],
            ),
            &HashSet::new(),
        );

        assert!(image.dangling);
        assert_eq!(image.repository.as_deref(), Some("localhost:5000/app"));
        assert_eq!(image.tag, None);
    }

    #[test]
    fn an_untagged_image_with_a_none_digest_falls_back_to_its_id() {
        let image = to_image(
            &pulled_then_untagged("sha256:abc", &["<none>@<none>"]),
            &HashSet::new(),
        );

        assert_eq!(image.repository.as_deref(), Some("<untagged>@abc"));
    }

    #[test]
    fn an_image_is_in_use_when_a_container_runs_it() {
        let used = HashSet::from(["sha256:abc".to_string()]);
        let image = to_image(&summary("sha256:abc", &[]), &used);

        assert!(image.in_use);
        assert!(image.dangling);
    }

    #[test]
    fn prune_removes_tagged_unused_images_too_not_only_dangling_ones() {
        let filters = every_unused_image().filters.expect("prune filters");

        assert_eq!(filters.get("dangling"), Some(&vec!["false".to_string()]));
    }

    #[test]
    fn a_docker_hub_pull_omits_the_registry_and_others_keep_it() {
        assert_eq!(
            full_image_reference("nginx", "1.27", "docker.io"),
            "nginx:1.27"
        );
        assert_eq!(
            full_image_reference("org/app", "latest", "ghcr.io"),
            "ghcr.io/org/app:latest"
        );
    }

    #[test]
    fn an_official_image_lives_in_the_library_namespace() {
        assert_eq!(docker_hub_repository("nginx"), "library/nginx");
        assert_eq!(docker_hub_repository("bitnami/redis"), "bitnami/redis");
    }

    #[test]
    fn a_search_result_falls_back_through_the_name_fields_and_defaults_the_rest() {
        let result = to_search_result(&json!({ "slug": "org/app", "description": "An app" }));

        assert_eq!(
            result,
            Some(json!({
                "name": "org/app",
                "description": "An app",
                "star_count": 0,
                "pull_count": 0,
                "is_official": false,
                "is_automated": false,
            }))
        );
    }

    #[test]
    fn a_search_result_without_a_name_is_dropped() {
        assert_eq!(to_search_result(&json!({ "repo_name": "" })), None);
        assert_eq!(to_search_result(&json!({ "star_count": 3 })), None);
    }
}
