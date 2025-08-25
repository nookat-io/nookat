use crate::entities::Volume;
use bollard::container::ListContainersOptions;
use bollard::volume::{ListVolumesOptions, PruneVolumesOptions, RemoveVolumeOptions};
use bollard::Docker;
use tracing::instrument;

#[derive(Default, Debug)]
pub struct VolumesService {}

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
            all: true,
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
            let ref_count = containers
                .iter()
                .filter_map(|container| container.mounts.as_ref())
                .flat_map(|mounts| mounts.iter())
                .filter(|mount| {
                    // For volumes, the 'name' field contains the volume name
                    // The 'source' field contains the storage path, not the volume name
                    if let Some(mount_name) = &mount.name {
                        mount_name == &volume.name
                    } else {
                        false
                    }
                })
                .count() as i64;

            // Create usage data
            volume.usage_data = Some(crate::entities::UsageData {
                size: 0, // Docker doesn't provide volume size through this API
                ref_count,
            });

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
        let options: PruneVolumesOptions<String> = PruneVolumesOptions::default();
        docker
            .prune_volumes(Some(options))
            .await
            .map_err(|e| format!("Failed to prune volumes: {}", e))?;

        Ok(())
    }
}
