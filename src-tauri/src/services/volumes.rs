use tracing::instrument;

#[derive(Default, Debug)]
pub struct VolumesService {}

use crate::entities::{Engine, Volume};
use bollard::volume::{ListVolumesOptions, PruneVolumesOptions, RemoveVolumeOptions};
use bollard::Docker;

impl VolumesService {
    #[instrument(skip_all, err)]
    pub async fn get_volumes(engine: &Engine) -> Result<Vec<Volume>, String> {
        let docker = engine.docker.as_ref().ok_or("Docker not found")?;

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
    pub async fn remove_volume(engine: &Engine, name: &str) -> Result<(), String> {
        let docker = engine.docker.as_ref().ok_or("Docker not found")?;

        let options = RemoveVolumeOptions::default();
        docker
            .remove_volume(name, Some(options))
            .await
            .map_err(|e| format!("Failed to remove volume {}: {}", name, e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn bulk_remove_volumes(engine: &Engine, names: &[String]) -> Result<(), String> {
        let docker = engine.docker.as_ref().ok_or("Docker not found")?;

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
    pub async fn inspect_volume(engine: &Engine, name: &str) -> Result<Volume, String> {
        let docker = engine.docker.as_ref().ok_or("Docker not found")?;

        let bollard_volume = docker
            .inspect_volume(name)
            .await
            .map_err(|e| format!("Failed to inspect volume {}: {}", name, e))?;
        let volume = Volume::from(bollard_volume);

        Ok(volume)
    }

    #[instrument(skip_all, err)]
    pub async fn prune_volumes(engine: &Engine) -> Result<(), String> {
        let docker = engine.docker.as_ref().ok_or("Docker not found")?;

        let options: PruneVolumesOptions<String> = PruneVolumesOptions::default();
        docker
            .prune_volumes(Some(options))
            .await
            .map_err(|e| format!("Failed to prune volumes: {}", e))?;

        Ok(())
    }
}
