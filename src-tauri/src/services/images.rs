use super::image_pull::follow_pull;
use crate::entities::{
    DockerHubTag, Image, ImagePruneScope, ImagePullOutcome, ImagePullProgress, PruneResult,
    PrunedImage,
};
use bollard::models::{ContainerSummary, ImageSummary};
use bollard::query_parameters::{
    CreateImageOptions, ListImagesOptions, PruneImagesOptions, RemoveImageOptions,
};
use bollard::Docker;
use reqwest::{StatusCode, Url};
use serde_json::Value;
use std::collections::{BTreeSet, HashMap, HashSet};
use std::future::Future;
use std::time::Duration;
use tracing::{debug, info, instrument};

const DOCKER_HUB_REGISTRY: &str = "docker.io";
const DOCKER_HUB_SEARCH_URL: &str = "https://hub.docker.com/v2/search/repositories/";
const DOCKER_HUB_SEARCH_PAGE_SIZE: &str = "25";
const DOCKER_HUB_REPOSITORIES_URL: &str = "https://hub.docker.com/v2/repositories/";
const DOCKER_HUB_TAGS_PAGE_SIZE: &str = "100";
const MAX_TAG_LENGTH: usize = 128;
const ATTESTATION_PLATFORM: &str = "unknown";
const MAINSTREAM_ARCHITECTURES: [&str; 2] = ["amd64", "arm64"];
const DOCKER_HUB_TIMEOUT: Duration = Duration::from_secs(15);
const DOCKER_HUB_USER_AGENT: &str = "Nookat/1.0";

#[derive(Default, Debug)]
pub struct ImagesService {}

impl ImagesService {
    #[instrument(skip_all, err)]
    pub async fn get_images(
        docker: &Docker,
        containers: &[ContainerSummary],
    ) -> Result<Vec<Image>, String> {
        let images = list_image_summaries(docker).await?;

        let used_image_ids: HashSet<String> = containers
            .iter()
            .filter_map(|container| container.image_id.clone())
            .collect();

        debug!("Found {} images used by containers", used_image_ids.len());

        Ok(images
            .iter()
            .flat_map(|summary| to_images(summary, &used_image_ids))
            .collect())
    }

    #[instrument(skip_all, err)]
    pub async fn perform_prune(
        docker: &Docker,
        scope: ImagePruneScope,
    ) -> Result<PruneResult, String> {
        let before = list_image_summaries(docker).await?;
        let result = docker
            .prune_images(Some(prune_options(scope)))
            .await
            .map_err(|e| format!("Failed to prune images: {}", e))?;
        let after = list_image_summaries(docker).await?;

        Ok(PruneResult {
            images_deleted: removed_images(&before, &after),
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
        cancelled: impl Future<Output = ()>,
        report_progress: impl FnMut(ImagePullProgress),
    ) -> Result<ImagePullOutcome, String> {
        debug!(
            "Pulling image: {}:{} from registry: {}",
            image_name, tag, registry
        );

        let full_image_name = full_image_reference(image_name, tag, registry);
        debug!("Full image name for pull: {}", full_image_name);

        let options = CreateImageOptions {
            from_image: Some(full_image_name.clone()),
            ..Default::default()
        };
        let pull_messages = docker.create_image(Some(options), None, None);
        let outcome = follow_pull(pull_messages, cancelled, report_progress)
            .await
            .map_err(|e| format!("Failed to pull image {}: {}", full_image_name, e))?;

        match outcome {
            ImagePullOutcome::Completed => debug!("Pulled image {}", full_image_name),
            ImagePullOutcome::Cancelled => info!("Cancelled the pull of {}", full_image_name),
        }
        Ok(outcome)
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
    pub async fn fetch_image_tags(
        image_name: &str,
        name_filter: &str,
    ) -> Result<Vec<String>, String> {
        debug!(
            "Fetching tags of {} containing {:?}",
            image_name, name_filter
        );

        let response = docker_hub_client()?
            .get(docker_hub_tags_url(image_name)?)
            .query(&[
                ("page_size", DOCKER_HUB_TAGS_PAGE_SIZE),
                ("name", name_filter),
            ])
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

        Ok(tag_names(&page))
    }

    #[instrument(skip_all, err)]
    pub async fn fetch_image_tag(
        image_name: &str,
        tag: &str,
    ) -> Result<Option<DockerHubTag>, String> {
        debug!("Looking up tag {} of {}", tag, image_name);

        if !is_valid_tag(tag) {
            return Err(format!("{:?} is not a valid image tag", tag));
        }

        let mut url = docker_hub_tags_url(image_name)?;
        url.path_segments_mut()
            .map_err(|_| "Docker Hub tags URL cannot take a tag".to_string())?
            .push(tag);

        let response = docker_hub_client()?
            .get(url)
            .send()
            .await
            .map_err(|e| format!("Failed to look up {}:{}: {}", image_name, tag, e))?;

        if response.status() == StatusCode::NOT_FOUND {
            return Ok(None);
        }

        if !response.status().is_success() {
            return Err(format!(
                "Docker Hub API returned status: {} for {}:{}",
                response.status(),
                image_name,
                tag
            ));
        }

        let raw = response
            .json::<Value>()
            .await
            .map_err(|e| format!("Failed to parse Docker Hub tag response: {}", e))?;

        Ok(Some(to_docker_hub_tag(tag, &raw)))
    }
}

async fn list_image_summaries(docker: &Docker) -> Result<Vec<ImageSummary>, String> {
    docker
        .list_images(Some(ListImagesOptions::default()))
        .await
        .map_err(|e| format!("Failed to list images: {}", e))
}

fn prune_options(scope: ImagePruneScope) -> PruneImagesOptions {
    let dangling = match scope {
        ImagePruneScope::Dangling => "true",
        ImagePruneScope::AllUnused => "false",
    };
    PruneImagesOptions {
        filters: Some(HashMap::from([(
            "dangling".to_string(),
            vec![dangling.to_string()],
        )])),
    }
}

fn removed_images(before: &[ImageSummary], after: &[ImageSummary]) -> Vec<PrunedImage> {
    let remaining_ids: HashSet<&str> = after.iter().map(|summary| summary.id.as_str()).collect();
    before
        .iter()
        .filter(|summary| !remaining_ids.contains(summary.id.as_str()))
        .map(|summary| PrunedImage {
            id: summary.id.clone(),
            tags: summary
                .repo_tags
                .iter()
                .filter(|reference| reference.as_str() != UNTAGGED_REFERENCE)
                .cloned()
                .collect(),
        })
        .collect()
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

fn docker_hub_tags_url(image_name: &str) -> Result<Url, String> {
    let mut url = Url::parse(DOCKER_HUB_REPOSITORIES_URL)
        .map_err(|e| format!("Invalid Docker Hub URL: {}", e))?;
    url.path_segments_mut()
        .map_err(|_| "Docker Hub URL cannot take a repository".to_string())?
        .pop_if_empty()
        .extend(docker_hub_repository(image_name).split('/'))
        .push("tags");
    Ok(url)
}

fn is_valid_tag(tag: &str) -> bool {
    let mut chars = tag.chars();
    let starts_well = chars
        .next()
        .is_some_and(|first| first.is_ascii_alphanumeric() || first == '_');
    starts_well
        && tag.len() <= MAX_TAG_LENGTH
        && chars.all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | '-'))
}

fn tag_names(page: &Value) -> Vec<String> {
    page.get("results")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|tag| tag.get("name").and_then(Value::as_str))
        .map(str::to_string)
        .collect()
}

fn to_docker_hub_tag(tag: &str, raw: &Value) -> DockerHubTag {
    let text = |field: &str| raw.get(field).and_then(Value::as_str).map(str::to_string);

    DockerHubTag {
        name: text("name").unwrap_or_else(|| tag.to_string()),
        size: raw.get("full_size").and_then(Value::as_u64),
        last_pushed: text("tag_last_pushed").or_else(|| text("last_updated")),
        platforms: platforms(raw),
    }
}

fn platforms(raw: &Value) -> Vec<String> {
    let field = |image: &Value, name: &str| {
        image
            .get(name)
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty() && *value != ATTESTATION_PLATFORM)
            .map(str::to_string)
    };

    let unique: BTreeSet<(bool, String)> = raw
        .get("images")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|image| {
            let os = field(image, "os")?;
            let architecture = field(image, "architecture")?;
            let is_niche = !MAINSTREAM_ARCHITECTURES.contains(&architecture.as_str());
            let platform = match field(image, "variant") {
                Some(variant) => format!("{os}/{architecture}/{variant}"),
                None => format!("{os}/{architecture}"),
            };
            Some((is_niche, platform))
        })
        .collect();
    unique.into_iter().map(|(_, platform)| platform).collect()
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

fn to_images(summary: &ImageSummary, used_image_ids: &HashSet<String>) -> Vec<Image> {
    let row = |id: &str, repository: String, tag: Option<String>, dangling: bool| Image {
        id: id.to_string(),
        repository: Some(repository),
        tag,
        image_id: summary.id.clone(),
        created: summary.created,
        size: summary.size,
        in_use: used_image_ids.contains(&summary.id),
        dangling,
    };

    let tagged_rows: Vec<Image> = summary
        .repo_tags
        .iter()
        .filter(|reference| reference.as_str() != UNTAGGED_REFERENCE)
        .map(|reference| {
            let (repository, tag) = split_reference(reference);
            row(reference, repository, tag, false)
        })
        .collect();

    if tagged_rows.is_empty() {
        vec![row(&summary.id, untagged_repository(summary), None, true)]
    } else {
        tagged_rows
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
        docker_hub_repository, docker_hub_tags_url, full_image_reference, is_valid_tag,
        prune_options, removed_images, split_reference, tag_names, to_docker_hub_tag, to_images,
        to_search_result, DockerHubTag,
    };
    use crate::entities::{Image, ImagePruneScope, PrunedImage};
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

    fn only_row(summary: &ImageSummary, used_image_ids: &HashSet<String>) -> Image {
        let mut images = to_images(summary, used_image_ids);
        assert_eq!(images.len(), 1, "expected one row, got {images:?}");
        images.remove(0)
    }

    fn row_ids(images: &[Image]) -> Vec<&str> {
        images.iter().map(|image| image.id.as_str()).collect()
    }

    fn several_tags() -> ImageSummary {
        summary("sha256:abc", &["alpine:3.20", "localhost:5000/alpine:3.20"])
    }

    #[test]
    fn an_image_with_several_tags_is_listed_once_per_tag() {
        let images = to_images(&several_tags(), &HashSet::new());

        assert_eq!(
            row_ids(&images),
            vec!["alpine:3.20", "localhost:5000/alpine:3.20"]
        );
        let repositories: Vec<_> = images
            .iter()
            .map(|image| image.repository.as_deref())
            .collect();
        assert_eq!(
            repositories,
            vec![Some("alpine"), Some("localhost:5000/alpine")]
        );
        for image in &images {
            assert_eq!(image.tag.as_deref(), Some("3.20"));
            assert_eq!(image.image_id, "sha256:abc");
            assert!(!image.dangling);
        }
    }

    #[test]
    fn every_tag_of_an_image_in_use_is_in_use() {
        let used = HashSet::from(["sha256:abc".to_string()]);
        let images = to_images(&several_tags(), &used);

        assert_eq!(images.len(), 2);
        assert!(images.iter().all(|image| image.in_use));
    }

    #[test]
    fn an_untagged_image_is_one_row_under_its_image_id() {
        for tags in [&[][..], &["<none>:<none>"][..]] {
            let image = only_row(&summary("sha256:abc", tags), &HashSet::new());

            assert_eq!(image.id, "sha256:abc");
            assert_eq!(image.image_id, "sha256:abc");
            assert!(image.dangling);
        }
    }

    #[test]
    fn a_tagged_image_is_not_dangling_even_when_unused() {
        let image = only_row(&summary("sha256:abc", &["postgres:18"]), &HashSet::new());

        assert!(!image.dangling);
        assert!(!image.in_use);
        assert_eq!(image.repository.as_deref(), Some("postgres"));
        assert_eq!(image.tag.as_deref(), Some("18"));
    }

    #[test]
    fn an_image_without_tags_is_dangling() {
        let image = only_row(&summary("sha256:abc", &[]), &HashSet::new());

        assert!(image.dangling);
        assert_eq!(image.repository.as_deref(), Some("<untagged>@abc"));
        assert_eq!(image.tag, None);
    }

    #[test]
    fn an_image_tagged_none_by_an_older_daemon_is_dangling() {
        let image = only_row(&summary("sha256:abc", &["<none>:<none>"]), &HashSet::new());

        assert!(image.dangling);
        assert_eq!(image.repository.as_deref(), Some("<untagged>@abc"));
    }

    #[test]
    fn an_untagged_image_keeps_the_repository_it_was_pulled_from() {
        let image = only_row(
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
        let image = only_row(
            &pulled_then_untagged("sha256:abc", &["<none>@<none>"]),
            &HashSet::new(),
        );

        assert_eq!(image.repository.as_deref(), Some("<untagged>@abc"));
    }

    #[test]
    fn an_image_is_in_use_when_a_container_runs_it() {
        let used = HashSet::from(["sha256:abc".to_string()]);
        let image = only_row(&summary("sha256:abc", &[]), &used);

        assert!(image.in_use);
        assert!(image.dangling);
    }

    #[test]
    fn pruning_every_unused_image_sends_dangling_false() {
        let filters = prune_options(ImagePruneScope::AllUnused)
            .filters
            .expect("prune filters");

        assert_eq!(filters.get("dangling"), Some(&vec!["false".to_string()]));
    }

    #[test]
    fn pruning_dangling_images_only_sends_dangling_true() {
        let filters = prune_options(ImagePruneScope::Dangling)
            .filters
            .expect("prune filters");

        assert_eq!(filters.get("dangling"), Some(&vec!["true".to_string()]));
    }

    #[test]
    fn a_prune_reports_each_image_that_is_gone_once_with_its_tags() {
        let before = [
            summary("sha256:aaa", &["alpine:3.20"]),
            summary("sha256:bbb", &["<none>:<none>"]),
            summary("sha256:ccc", &["busybox:1.36"]),
        ];
        let after = [summary("sha256:ccc", &["busybox:1.36"])];

        assert_eq!(
            removed_images(&before, &after),
            vec![
                PrunedImage {
                    id: "sha256:aaa".to_string(),
                    tags: vec!["alpine:3.20".to_string()],
                },
                PrunedImage {
                    id: "sha256:bbb".to_string(),
                    tags: vec![],
                },
            ]
        );
    }

    #[test]
    fn an_image_that_only_lost_a_tag_is_not_reported_as_removed() {
        let before = [summary("sha256:ddd", &["web:1", "web:2"])];
        let after = [summary("sha256:ddd", &["web:2"])];

        assert_eq!(removed_images(&before, &after), vec![]);
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

    #[test]
    fn tags_are_listed_from_the_repository_with_the_library_namespace_for_official_images() {
        assert_eq!(
            docker_hub_tags_url("nginx").unwrap().as_str(),
            "https://hub.docker.com/v2/repositories/library/nginx/tags"
        );
        assert_eq!(
            docker_hub_tags_url("nvidia/cuda").unwrap().as_str(),
            "https://hub.docker.com/v2/repositories/nvidia/cuda/tags"
        );
    }

    #[test]
    fn a_tag_follows_the_docker_reference_grammar() {
        for tag in ["latest", "13.5.0-runtime-ubuntu24.04", "_private", "V1.2"] {
            assert!(is_valid_tag(tag), "{tag} should be valid");
        }
        let too_long = "a".repeat(129);
        for tag in [
            "",
            "-dash",
            ".dot",
            "a/b",
            "a:b",
            "has space",
            "../x",
            too_long.as_str(),
        ] {
            assert!(!is_valid_tag(tag), "{tag} should be invalid");
        }
    }

    #[test]
    fn a_tags_page_yields_the_tag_names_in_order() {
        let page = json!({ "results": [{ "name": "13.5.0-base" }, { "name": "12.9.1-base" }, {}] });

        assert_eq!(tag_names(&page), vec!["13.5.0-base", "12.9.1-base"]);
        assert!(tag_names(&json!({})).is_empty());
    }

    #[test]
    fn a_tag_lists_amd64_and_arm64_first_once_each_without_attestation_manifests() {
        let raw = json!({
            "name": "alpine",
            "full_size": 26335122,
            "last_updated": "2026-11-18T19:53:53Z",
            "tag_last_pushed": "2026-11-18T19:50:00Z",
            "images": [
                { "os": "linux", "architecture": "386" },
                { "os": "linux", "architecture": "arm64", "variant": "v8" },
                { "os": "linux", "architecture": "amd64" },
                { "os": "linux", "architecture": "amd64", "variant": "" },
                { "os": "linux", "architecture": "arm", "variant": "v7" },
                { "os": "unknown", "architecture": "unknown" }
            ]
        });

        assert_eq!(
            to_docker_hub_tag("alpine", &raw),
            DockerHubTag {
                name: "alpine".to_string(),
                size: Some(26335122),
                last_pushed: Some("2026-11-18T19:50:00Z".to_string()),
                platforms: vec![
                    "linux/amd64".to_string(),
                    "linux/arm64/v8".to_string(),
                    "linux/386".to_string(),
                    "linux/arm/v7".to_string(),
                ],
            }
        );
    }

    #[test]
    fn a_tag_without_details_keeps_the_requested_name() {
        assert_eq!(
            to_docker_hub_tag(
                "13.5.0-base",
                &json!({ "last_updated": "2026-11-06T00:00:00Z" })
            ),
            DockerHubTag {
                name: "13.5.0-base".to_string(),
                size: None,
                last_pushed: Some("2026-11-06T00:00:00Z".to_string()),
                platforms: vec![],
            }
        );
    }

    #[cfg(unix)]
    mod against_a_fake_daemon {
        use super::super::ImagesService;
        use crate::entities::{ImagePruneScope, ImagePullOutcome, PrunedImage};
        use crate::services::fake_docker_daemon::{http_response, request_lines, serve_daemon};
        use bollard::models::ContainerSummary;
        use bollard::Docker;
        use reqwest::Url;
        use std::sync::atomic::{AtomicUsize, Ordering};
        use std::sync::Arc;

        const WEB_AND_IDLE_IMAGES: &str = r#"[
            {"Id":"sha256:web","ParentId":"","RepoTags":["web:latest"],"RepoDigests":[],"Created":0,"Size":0,"SharedSize":-1,"Labels":{},"Containers":-1},
            {"Id":"sha256:idle","ParentId":"","RepoTags":["idle:latest"],"RepoDigests":[],"Created":0,"Size":0,"SharedSize":-1,"Labels":{},"Containers":-1}
        ]"#;

        #[tokio::test]
        async fn marks_images_in_use_from_the_given_containers_without_listing_them() {
            let dir = tempfile::tempdir().unwrap();
            let socket = dir.path().join("docker.sock");
            let requests = serve_daemon(&socket, |_| {
                http_response("200 OK", "application/json", WEB_AND_IDLE_IMAGES)
            });
            let docker = Docker::connect_with_unix(
                socket.to_str().unwrap(),
                5,
                bollard::API_DEFAULT_VERSION,
            )
            .unwrap();
            let containers = [ContainerSummary {
                image_id: Some("sha256:web".to_string()),
                ..Default::default()
            }];

            let images = ImagesService::get_images(&docker, &containers)
                .await
                .unwrap();

            let in_use_of = |id: &str| {
                images
                    .iter()
                    .find(|image| image.image_id == id)
                    .map(|image| image.in_use)
            };
            assert_eq!(in_use_of("sha256:web"), Some(true));
            assert_eq!(in_use_of("sha256:idle"), Some(false));
            let lines = request_lines(&requests);
            assert!(
                lines.iter().all(|line| !line.contains("/containers/json")),
                "{lines:?}"
            );
        }

        #[tokio::test]
        async fn a_pull_goes_straight_to_the_daemon_without_a_ping() {
            let dir = tempfile::tempdir().unwrap();
            let socket = dir.path().join("docker.sock");
            let requests = serve_daemon(&socket, |_| {
                http_response(
                    "200 OK",
                    "application/json",
                    "{\"status\":\"Pulling from library/alpine\",\"id\":\"3.20\"}\n{\"status\":\"Status: Downloaded newer image for alpine:3.20\"}\n",
                )
            });
            let docker = Docker::connect_with_unix(
                socket.to_str().unwrap(),
                5,
                bollard::API_DEFAULT_VERSION,
            )
            .unwrap();

            let outcome = ImagesService::pull_image(
                &docker,
                "alpine",
                "3.20",
                "docker.io",
                std::future::pending(),
                |_| {},
            )
            .await;

            assert_eq!(outcome, Ok(ImagePullOutcome::Completed));
            let lines = request_lines(&requests);
            assert_eq!(lines.len(), 1, "{lines:?}");
            assert!(lines[0].starts_with("POST"), "{lines:?}");
            assert!(lines[0].contains("/images/create?"), "{lines:?}");
            assert!(lines[0].contains("fromImage=alpine%3A3.20"), "{lines:?}");
            assert!(
                lines.iter().all(|line| !line.contains("/_ping")),
                "{lines:?}"
            );
        }

        #[tokio::test]
        async fn a_prune_reports_the_images_that_are_gone_and_sends_the_chosen_scope() {
            let dir = tempfile::tempdir().unwrap();
            let socket = dir.path().join("docker.sock");
            let before = serde_json::to_string(&[
                super::summary("sha256:aaa", &["alpine:3.20"]),
                super::summary("sha256:ccc", &["busybox:1.36"]),
            ])
            .unwrap();
            let after =
                serde_json::to_string(&[super::summary("sha256:ccc", &["busybox:1.36"])]).unwrap();
            let image_lists = Arc::new(AtomicUsize::new(0));
            let lists_served = image_lists.clone();
            let requests = serve_daemon(&socket, move |request| {
                if request.contains("/images/prune") {
                    return http_response(
                        "200 OK",
                        "application/json",
                        r#"{"ImagesDeleted":[{"Untagged":"alpine:3.20"},{"Deleted":"sha256:aaa"},{"Deleted":"sha256:1111"}],"SpaceReclaimed":1024}"#,
                    );
                }
                let images = if lists_served.fetch_add(1, Ordering::SeqCst) == 0 {
                    &before
                } else {
                    &after
                };
                http_response("200 OK", "application/json", images)
            });
            let docker = Docker::connect_with_unix(
                socket.to_str().unwrap(),
                5,
                bollard::API_DEFAULT_VERSION,
            )
            .unwrap();

            let result = ImagesService::perform_prune(&docker, ImagePruneScope::Dangling)
                .await
                .unwrap();

            assert_eq!(
                result.images_deleted,
                vec![PrunedImage {
                    id: "sha256:aaa".to_string(),
                    tags: vec!["alpine:3.20".to_string()],
                }]
            );
            assert_eq!(result.space_reclaimed, 1024);
            let lines = request_lines(&requests);
            assert_eq!(lines.len(), 3, "{lines:?}");
            assert!(lines[0].starts_with("GET"), "{lines:?}");
            assert!(lines[0].contains("/images/json"), "{lines:?}");
            assert!(lines[1].starts_with("POST"), "{lines:?}");
            assert!(lines[1].contains("/images/prune?"), "{lines:?}");
            assert!(lines[2].starts_with("GET"), "{lines:?}");
            assert!(lines[2].contains("/images/json"), "{lines:?}");
            let path = lines[1].split_whitespace().nth(1).unwrap();
            let url = Url::parse(&format!("http://daemon{path}")).unwrap();
            let filters = url
                .query_pairs()
                .find(|(name, _)| name == "filters")
                .map(|(_, value)| value.into_owned())
                .expect("filters query");
            assert_eq!(
                serde_json::from_str::<serde_json::Value>(&filters).unwrap(),
                serde_json::json!({"dangling": ["true"]})
            );
        }
    }
}
