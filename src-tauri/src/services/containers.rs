use bollard::models::ContainerSummary;
use bollard::{
    container::{ListContainersOptions, StartContainerOptions, StopContainerOptions, RestartContainerOptions, RemoveContainerOptions},
    Docker,
};

#[derive(Default, Debug)]
pub struct ContainersService {}

impl ContainersService {
    pub async fn get_containers() -> Vec<ContainerSummary> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        let options: ListContainersOptions<String> = ListContainersOptions {
            all: true,
            size: true,
            ..Default::default()
        };

        let containers = &docker
            .list_containers(Some(options))
            .await
            .expect("Failed to list containers");

        containers.iter().map(|c| c.clone()).collect()
    }

    pub async fn start_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        let options = StartContainerOptions::<String> {
            ..Default::default()
        };

        docker
            .start_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to start container: {}", e))?;

        Ok(())
    }

    pub async fn stop_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        let options = StopContainerOptions {
            t: 0,
            ..Default::default()
        };

        docker
            .stop_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to stop container: {}", e))?;

        Ok(())
    }

    pub async fn pause_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        docker
            .pause_container(id)
            .await
            .map_err(|e| format!("Failed to pause container: {}", e))?;

        Ok(())
    }

    pub async fn unpause_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        docker
            .unpause_container(id)
            .await
            .map_err(|e| format!("Failed to unpause container: {}", e))?;

        Ok(())
    }

    pub async fn restart_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        let options = RestartContainerOptions {
            t: 0,
            ..Default::default()
        };

        docker
            .restart_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to restart container: {}", e))?;

        Ok(())
    }

    pub async fn remove_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        let options = RemoveContainerOptions {
            force: false,
            link: false,
            v: false,
            ..Default::default()
        };

        docker
            .remove_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to remove container: {}", e))?;

        Ok(())
    }

    pub async fn force_remove_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        let options = RemoveContainerOptions {
            force: true,
            link: false,
            v: false,
            ..Default::default()
        };

        docker
            .remove_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to force remove container: {}", e))?;

        Ok(())
    }
}
