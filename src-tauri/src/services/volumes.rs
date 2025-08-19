use tracing::instrument;

#[derive(Default, Debug)]
pub struct VolumesService {}

use crate::entities::Volume;
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

        // Convert Bollard volumes to our custom Volume type
        Ok(bollard_volumes.into_iter().map(Volume::from).collect())
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
