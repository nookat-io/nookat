use crate::entities::{UsageData, Volume, VolumePruneResult};
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

    #[instrument(skip_all, err)]
    pub async fn bulk_remove_volumes(docker: &Docker, names: &[String]) -> Result<(), String> {
        for name in names {
            let options = RemoveVolumeOptions::default();
            docker
                .remove_volume(name, Some(options))
                .await
                .map_err(|e| format!("Failed to remove volume {}: {}", name, e))?;
        }

        Ok(())
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
}
