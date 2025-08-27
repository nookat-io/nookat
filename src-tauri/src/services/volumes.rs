use tokio::time;
use tracing::{debug, instrument};

#[derive(Default, Debug)]
pub struct VolumesService {}

use crate::entities::Volume;
use bollard::container::ListContainersOptions;
use bollard::volume::{ListVolumesOptions, PruneVolumesOptions, RemoveVolumeOptions};
use bollard::Docker;

impl VolumesService {
    #[instrument(skip_all, err)]
    pub async fn get_volumes(docker: &Docker) -> Result<Vec<Volume>, String> {
        let options: ListVolumesOptions<String> = ListVolumesOptions::default();

        let bollard_volumes = docker
            .list_volumes(Some(options))
            .await
            .map_err(|e| format!("Failed to list volumes: {}", e))?
            .volumes
            .unwrap_or_default();

        // Get all containers to check volume usage
        let containers_options = ListContainersOptions::<String> {
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

    #[instrument(skip_all, err)]
    pub async fn prune_volumes(docker: &Docker) -> Result<(), String> {
        debug!("Starting volume pruning process");

        // First, try the standard prune operation
        let options: PruneVolumesOptions<String> = PruneVolumesOptions::default();

        let result = docker
            .prune_volumes(Some(options))
            .await
            .map_err(|e| format!("Failed to prune volumes: {}", e))?;

        // Log the result for debugging
        if let Some(volumes_deleted) = &result.volumes_deleted {
            debug!(
                "Standard prune removed {} volumes: {:?}",
                volumes_deleted.len(),
                volumes_deleted
            );
        }
        if let Some(space_reclaimed) = result.space_reclaimed {
            debug!("Reclaimed {} bytes", space_reclaimed);
        }

        // After standard prune, manually check for any remaining unused volumes
        // and remove them to ensure complete cleanup
        debug!("Checking for remaining unused volumes after standard prune");
        let remaining_volumes = Self::get_volumes(docker).await?;
        debug!(
            "Found {} remaining volumes after standard prune",
            remaining_volumes.len()
        );

        let unused_volumes: Vec<String> = remaining_volumes
            .into_iter()
            .filter(|volume| {
                // A volume is unused if it has no reference count
                let is_unused = volume
                    .usage_data
                    .as_ref()
                    .map(|usage| usage.ref_count == 0)
                    .unwrap_or(true);

                if is_unused {
                    debug!(
                        "Volume {} appears to be unused (ref_count: {:?})",
                        volume.name,
                        volume.usage_data.as_ref().map(|u| u.ref_count)
                    );
                } else {
                    debug!(
                        "Volume {} is still in use (ref_count: {:?})",
                        volume.name,
                        volume.usage_data.as_ref().map(|u| u.ref_count)
                    );
                }

                is_unused
            })
            .map(|volume| volume.name)
            .collect();

        if !unused_volumes.is_empty() {
            debug!(
                "Found {} additional unused volumes after standard prune: {:?}",
                unused_volumes.len(),
                unused_volumes
            );

            // Remove the remaining unused volumes with a small delay between operations
            // to avoid overwhelming the Docker daemon
            for (index, volume_name) in unused_volumes.iter().enumerate() {
                if let Err(e) = Self::remove_volume(docker, volume_name).await {
                    debug!("Failed to remove unused volume {}: {}", volume_name, e);
                    // Continue with other volumes even if one fails
                } else {
                    debug!("Successfully removed unused volume: {}", volume_name);
                }

                // Add a small delay between operations (except for the last one)
                if index < unused_volumes.len() - 1 {
                    time::sleep(time::Duration::from_millis(100)).await;
                }
            }

            debug!(
                "Manually removed {} additional unused volumes",
                unused_volumes.len()
            );
        } else {
            debug!("No additional unused volumes found after standard prune");
        }

        debug!("Volume pruning process completed");
        Ok(())
    }
}
