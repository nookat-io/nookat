use tracing::{debug, instrument};

#[derive(Default, Debug)]
pub struct VolumesService {}

use crate::entities::{Volume, VolumePruneResult};
use bollard::query_parameters::{
    ListContainersOptions, ListVolumesOptions, PruneVolumesOptions, RemoveVolumeOptions,
};
use bollard::Docker;

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

        // Get all containers to check volume usage
        let containers_options = ListContainersOptions {
            all: true, // Include stopped containers
            ..Default::default()
        };

        let containers = docker
            .list_containers(Some(containers_options))
            .await
            .map_err(|e| format!("Failed to list containers: {}", e))?;

        // Convert Bollard volumes to our custom Volume type and determine usage
        let mut volumes = Vec::new();
        for bollard_volume in bollard_volumes {
            let mut volume = Volume::from(bollard_volume);

            // Determine if volume is in use by checking container mounts
            // Check both running and stopped containers
            let ref_count = containers
                .iter()
                .filter(|container| {
                    container.mounts.as_ref().is_some_and(|mounts| {
                        mounts
                            .iter()
                            .any(|m| m.name.as_deref() == Some(&volume.name))
                    })
                })
                .count() as i64;

            volume.usage_data = Some(crate::entities::UsageData { size: 0, ref_count });

            volumes.push(volume);
        }

        Ok(volumes)
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

    /// Prune volumes using the daemon's own prune endpoint, and nothing else.
    ///
    /// Docker deliberately restricts `volume prune` to *anonymous* volumes: named
    /// volumes are the ones users create to outlive container churn (database data
    /// directories, caches, uploads), so removing them is never implied by "prune
    /// unused". The daemon is also the only party that can see every reason a
    /// volume is protected -- swarm cluster volumes, containers outside the
    /// current context -- so its answer is authoritative and is not second-guessed
    /// here. Named volumes are removed only through an explicit selection in the
    /// UI, which routes to `remove_volume` / `bulk_remove_volumes`.
    #[instrument(skip_all, err)]
    pub async fn prune_volumes(docker: &Docker) -> Result<VolumePruneResult, String> {
        debug!("Pruning unused anonymous volumes");

        let options = PruneVolumesOptions::default();

        let result: VolumePruneResult = docker
            .prune_volumes(Some(options))
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
