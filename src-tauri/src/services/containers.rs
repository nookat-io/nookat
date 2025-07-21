use bollard::models::ContainerSummary;
use bollard::{container::ListContainersOptions, Docker};

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

    pub async fn remove_container(id: String) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        docker.remove_container(&id, None).await.unwrap();

        Ok(())
    }
}
