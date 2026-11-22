use crate::entities::{BulkOutcome, UsageData, Volume, VolumePruneResult};
use crate::services::run_for_each_concurrently;
use bollard::models::ContainerSummary;
use bollard::query_parameters::{
    ListContainersOptions, ListVolumesOptions, PruneVolumesOptions, RemoveVolumeOptions,
};
use bollard::Docker;
use tracing::{debug, instrument};

#[derive(Default, Debug)]
pub struct VolumesService {}

impl VolumesService {
    #[instrument(skip_all, err)]
    pub async fn get_volumes(docker: &Docker) -> Result<Vec<Volume>, String> {
        let options = ListVolumesOptions::default();

        let bollard_volumes = docker
            .list_volumes(Some(options))
            .await
            .map_err(|e| format!("Failed to list volumes: {}", e))?
            .volumes
            .unwrap_or_default();

        let running_and_stopped_containers = ListContainersOptions {
            all: true,
            ..Default::default()
        };

        let containers = docker
            .list_containers(Some(running_and_stopped_containers))
            .await
            .map_err(|e| format!("Failed to list containers: {}", e))?;

        Ok(bollard_volumes
            .into_iter()
            .map(|bollard_volume| {
                let mut volume = Volume::from(bollard_volume);
                volume.usage_data = Some(UsageData {
                    size: 0,
                    ref_count: count_containers_mounting(&volume.name, &containers),
                });
                volume
            })
            .collect())
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
        let bollard_volume = docker
            .inspect_volume(name)
            .await
            .map_err(|e| format!("Failed to inspect volume {}: {}", name, e))?;
        Ok(Volume::from(bollard_volume))
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

fn count_containers_mounting(volume_name: &str, containers: &[ContainerSummary]) -> i64 {
    containers
        .iter()
        .filter(|container| {
            container.mounts.as_ref().is_some_and(|mounts| {
                mounts
                    .iter()
                    .any(|mount| mount.name.as_deref() == Some(volume_name))
            })
        })
        .count() as i64
}

fn anonymous_volumes_only() -> PruneVolumesOptions {
    PruneVolumesOptions::default()
}

#[cfg(test)]
mod tests {
    use super::{anonymous_volumes_only, count_containers_mounting};
    use bollard::models::{ContainerSummary, MountPoint};

    fn container_mounting(volume_names: &[&str]) -> ContainerSummary {
        ContainerSummary {
            mounts: Some(
                volume_names
                    .iter()
                    .map(|name| MountPoint {
                        name: Some(name.to_string()),
                        ..Default::default()
                    })
                    .collect(),
            ),
            ..Default::default()
        }
    }

    #[test]
    fn prune_never_asks_the_daemon_to_include_named_volumes() {
        assert!(anonymous_volumes_only().filters.is_none());
    }

    #[test]
    fn counts_every_container_that_mounts_the_volume() {
        let containers = [
            container_mounting(&["data"]),
            container_mounting(&["cache", "data"]),
            container_mounting(&["cache"]),
            ContainerSummary::default(),
        ];

        assert_eq!(count_containers_mounting("data", &containers), 2);
        assert_eq!(count_containers_mounting("logs", &containers), 0);
    }

    #[cfg(unix)]
    mod against_a_fake_daemon {
        use super::super::VolumesService;
        use crate::services::fake_docker_daemon::{http_response, request_lines, serve_daemon};
        use bollard::Docker;

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
            let docker = Docker::connect_with_unix(
                socket.to_str().unwrap(),
                5,
                bollard::API_DEFAULT_VERSION,
            )
            .unwrap();
            let names = ["a", "b", "c"].map(String::from);

            let outcome = VolumesService::bulk_remove_volumes(&docker, &names).await;

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
