use crate::entities::{BulkOutcome, Volume, VolumePruneResult, VolumeSizes};
use crate::services::run_for_each_concurrently;
use bollard::models::SystemDataUsageResponse;
use bollard::query_parameters::{
    DataUsageOptions, ListVolumesOptions, PruneVolumesOptions, RemoveVolumeOptions,
};
use bollard::Docker;
use std::collections::{HashMap, HashSet};
use tracing::{debug, instrument};

#[derive(Default, Debug)]
pub struct VolumesService {}

impl VolumesService {
    #[instrument(skip_all, err)]
    pub async fn get_volumes(docker: &Docker) -> Result<Vec<Volume>, String> {
        let (all_volumes, referenced_volumes) = tokio::try_join!(
            list_volumes_matching(docker, HashMap::new()),
            list_volumes_matching(docker, referenced_by_a_container()),
        )?;

        let referenced_names: HashSet<String> = referenced_volumes
            .into_iter()
            .map(|volume| volume.name)
            .collect();

        Ok(all_volumes
            .into_iter()
            .map(|volume| {
                let in_use = referenced_names.contains(&volume.name);
                Volume::from_summary(volume, in_use)
            })
            .collect())
    }

    #[instrument(skip_all, err)]
    pub async fn get_volume_sizes(docker: &Docker) -> Result<Option<VolumeSizes>, String> {
        let every_volume_with_its_usage = DataUsageOptions {
            _type: None,
            verbose: true,
        };

        let report = docker
            .df(Some(every_volume_with_its_usage))
            .await
            .map_err(|e| format!("Failed to read volume sizes: {}", e))?;

        Ok(sizes_by_volume_name(report))
    }

    #[instrument(skip_all, err)]
    pub async fn remove_volume(docker: &Docker, name: &str) -> Result<(), String> {
        let options = RemoveVolumeOptions::default();
        docker
            .remove_volume(name, Some(options))
            .await
            .map_err(|e| format!("Failed to remove volume {}: {}", name, e))?;

        Ok(())
    }

    #[instrument(skip_all)]
    pub async fn bulk_remove_volumes(docker: &Docker, names: &[String]) -> BulkOutcome {
        run_for_each_concurrently(names, |name| Self::remove_volume(docker, name)).await
    }

    #[instrument(skip_all, err)]
    pub async fn inspect_volume(docker: &Docker, name: &str) -> Result<Volume, String> {
        let mut referenced_with_this_name = referenced_by_a_container();
        referenced_with_this_name.insert("name".to_string(), vec![name.to_string()]);

        let (bollard_volume, referenced_volumes) = tokio::try_join!(
            async {
                docker
                    .inspect_volume(name)
                    .await
                    .map_err(|e| format!("Failed to inspect volume {}: {}", name, e))
            },
            list_volumes_matching(docker, referenced_with_this_name),
        )?;

        let in_use = referenced_volumes.iter().any(|volume| volume.name == name);
        Ok(Volume::from_summary(bollard_volume, in_use))
    }

    #[instrument(skip_all, err)]
    pub async fn prune_unused_anonymous_volumes(
        docker: &Docker,
    ) -> Result<VolumePruneResult, String> {
        debug!("Pruning unused anonymous volumes");

        let result: VolumePruneResult = docker
            .prune_volumes(Some(anonymous_volumes_only()))
            .await
            .map_err(|e| format!("Failed to prune volumes: {}", e))?
            .into();

        debug!(
            "Prune removed {} volumes, reclaiming {} bytes: {:?}",
            result.volumes_deleted.len(),
            result.space_reclaimed,
            result.volumes_deleted
        );

        Ok(result)
    }
}

async fn list_volumes_matching(
    docker: &Docker,
    filters: HashMap<String, Vec<String>>,
) -> Result<Vec<bollard::models::Volume>, String> {
    let options = ListVolumesOptions {
        filters: (!filters.is_empty()).then_some(filters),
    };

    Ok(docker
        .list_volumes(Some(options))
        .await
        .map_err(|e| format!("Failed to list volumes: {}", e))?
        .volumes
        .unwrap_or_default())
}

fn referenced_by_a_container() -> HashMap<String, Vec<String>> {
    HashMap::from([("dangling".to_string(), vec!["false".to_string()])])
}

fn sizes_by_volume_name(report: SystemDataUsageResponse) -> Option<VolumeSizes> {
    let volume_usage = report.volume_usage?;
    let sizes = volume_usage
        .items
        .unwrap_or_default()
        .into_iter()
        .filter_map(|item| serde_json::from_value::<bollard::models::Volume>(item).ok())
        .filter_map(|volume| {
            let size = volume.usage_data?.size;
            (size >= 0).then_some((volume.name, size))
        })
        .collect();
    Some(sizes)
}

fn anonymous_volumes_only() -> PruneVolumesOptions {
    PruneVolumesOptions::default()
}

#[cfg(test)]
mod tests {
    use super::{anonymous_volumes_only, sizes_by_volume_name};
    use bollard::models::{SystemDataUsageResponse, VolumesDiskUsage};
    use serde_json::json;
    use std::collections::HashMap;

    fn daemon_volume(name: &str) -> serde_json::Value {
        json!({
            "Name": name,
            "Driver": "local",
            "Mountpoint": format!("/var/lib/docker/volumes/{name}/_data"),
            "Labels": {},
            "Scope": "local",
            "Options": {},
        })
    }

    fn daemon_volume_of_size(name: &str, size: i64) -> serde_json::Value {
        let mut volume = daemon_volume(name);
        volume["UsageData"] = json!({ "Size": size, "RefCount": 1 });
        volume
    }

    #[test]
    fn prune_never_asks_the_daemon_to_include_named_volumes() {
        assert!(anonymous_volumes_only().filters.is_none());
    }

    #[test]
    fn sizes_come_from_the_disk_usage_report() {
        let report = SystemDataUsageResponse {
            volume_usage: Some(VolumesDiskUsage {
                items: Some(vec![
                    daemon_volume_of_size("data", 52_428_800),
                    daemon_volume_of_size("unmeasured", -1),
                    daemon_volume("without-usage"),
                ]),
                ..Default::default()
            }),
            ..Default::default()
        };

        assert_eq!(
            sizes_by_volume_name(report),
            Some(HashMap::from([("data".to_string(), 52_428_800)]))
        );
    }

    #[test]
    fn a_report_without_volume_usage_means_the_daemon_cannot_report_sizes() {
        assert_eq!(
            sizes_by_volume_name(SystemDataUsageResponse::default()),
            None
        );
    }

    #[test]
    fn a_report_with_no_volumes_has_empty_sizes() {
        let report = SystemDataUsageResponse {
            volume_usage: Some(VolumesDiskUsage::default()),
            ..Default::default()
        };

        assert_eq!(sizes_by_volume_name(report), Some(HashMap::new()));
    }

    #[cfg(unix)]
    mod against_a_fake_daemon {
        use super::super::VolumesService;
        use super::{daemon_volume, daemon_volume_of_size};
        use crate::services::fake_docker_daemon::{http_response, request_lines, serve_daemon};
        use bollard::Docker;
        use serde_json::json;
        use std::collections::HashMap;
        use std::path::Path;

        const NOT_DANGLING_FILTER: &str = "filters=%7B%22dangling%22%3A%5B%22false%22%5D%7D";
        const NOT_DANGLING_CONDITION: &str = "%22dangling%22%3A%5B%22false%22%5D";

        fn connect(socket: &Path) -> Docker {
            Docker::connect_with_unix(socket.to_str().unwrap(), 5, bollard::API_DEFAULT_VERSION)
                .unwrap()
        }

        async fn inspect_in_use(name: &str, referenced: Vec<serde_json::Value>) -> bool {
            let dir = tempfile::tempdir().unwrap();
            let socket = dir.path().join("docker.sock");
            let inspected = daemon_volume(name).to_string();
            let referenced = json!({ "Volumes": referenced }).to_string();
            let any_with_this_name = json!({ "Volumes": [daemon_volume(name)] }).to_string();
            serve_daemon(&socket, move |request| {
                let request_line = request.lines().next().unwrap_or_default();
                let body = if !request_line.starts_with("GET /volumes?") {
                    &inspected
                } else if request_line.contains(NOT_DANGLING_CONDITION) {
                    &referenced
                } else {
                    &any_with_this_name
                };
                http_response("200 OK", "application/json", body)
            });

            VolumesService::inspect_volume(&connect(&socket), name)
                .await
                .unwrap()
                .in_use
        }

        #[tokio::test]
        async fn inspect_reports_a_volume_in_use_when_the_daemon_lists_it_as_not_dangling() {
            assert!(inspect_in_use("data", vec![daemon_volume("data")]).await);
        }

        #[tokio::test]
        async fn inspect_ignores_referenced_volumes_whose_names_only_contain_the_name() {
            assert!(!inspect_in_use("data", vec![daemon_volume("data2")]).await);
        }

        #[tokio::test]
        async fn sizes_are_read_from_one_verbose_disk_usage_request() {
            let dir = tempfile::tempdir().unwrap();
            let socket = dir.path().join("docker.sock");
            let report = json!({
                "VolumeUsage": { "Items": [daemon_volume_of_size("data", 52_428_800)] }
            })
            .to_string();
            let requests = serve_daemon(&socket, move |_| {
                http_response("200 OK", "application/json", &report)
            });

            let sizes = VolumesService::get_volume_sizes(&connect(&socket))
                .await
                .unwrap();

            assert_eq!(
                sizes,
                Some(HashMap::from([("data".to_string(), 52_428_800)]))
            );
            let lines = request_lines(&requests);
            assert_eq!(lines.len(), 1, "{lines:?}");
            assert!(
                lines[0].starts_with("GET /system/df?verbose=true"),
                "{lines:?}"
            );
        }

        #[tokio::test]
        async fn a_volume_is_in_use_when_the_daemon_lists_it_as_not_dangling() {
            let dir = tempfile::tempdir().unwrap();
            let socket = dir.path().join("docker.sock");
            let in_use = json!({ "Volumes": [daemon_volume("data")] }).to_string();
            let all =
                json!({ "Volumes": [daemon_volume("data"), daemon_volume("orphan")] }).to_string();
            let any_other_dangling_filter =
                json!({ "Volumes": [daemon_volume("orphan")] }).to_string();
            let requests = serve_daemon(&socket, move |request| {
                let request_line = request.lines().next().unwrap_or_default();
                let body = if request_line.contains(NOT_DANGLING_FILTER) {
                    &in_use
                } else if request_line.contains("dangling") {
                    &any_other_dangling_filter
                } else {
                    &all
                };
                http_response("200 OK", "application/json", body)
            });

            let volumes = VolumesService::get_volumes(&connect(&socket))
                .await
                .unwrap();

            let in_use_by_name: HashMap<_, _> = volumes
                .iter()
                .map(|volume| (volume.name.as_str(), volume.in_use))
                .collect();
            assert_eq!(
                in_use_by_name,
                HashMap::from([("data", true), ("orphan", false)])
            );
            let lines = request_lines(&requests);
            assert!(
                lines.iter().all(|line| !line.contains("/containers/json")),
                "{lines:?}"
            );
        }

        #[tokio::test]
        async fn bulk_remove_tries_every_volume_and_reports_the_ones_in_use() {
            let dir = tempfile::tempdir().unwrap();
            let socket = dir.path().join("docker.sock");
            let requests = serve_daemon(&socket, |request| {
                if request.starts_with("DELETE /volumes/b") {
                    http_response(
                        "409 Conflict",
                        "application/json",
                        r#"{"message":"volume is in use"}"#,
                    )
                } else {
                    http_response("204 No Content", "text/plain", "")
                }
            });
            let names = ["a", "b", "c"].map(String::from);

            let outcome = VolumesService::bulk_remove_volumes(&connect(&socket), &names).await;

            assert_eq!(outcome.succeeded, ["a", "c"]);
            assert_eq!(outcome.failed.len(), 1);
            assert_eq!(outcome.failed[0].id, "b");
            assert!(
                outcome.failed[0].error.contains("volume is in use"),
                "{}",
                outcome.failed[0].error
            );
            let lines = request_lines(&requests);
            assert!(
                lines
                    .iter()
                    .any(|line| line.starts_with("DELETE /volumes/c")),
                "{lines:?}"
            );
        }
    }
}
