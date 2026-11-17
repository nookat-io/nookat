mod request;
mod validation;

use crate::entities::{CreateContainerError, CreateContainerSpec, CreatedContainer};
use bollard::errors::Error as DockerError;
use bollard::query_parameters::RemoveContainerOptions;
use bollard::Docker;
use tracing::{debug, instrument, warn};

use request::create_request;
use validation::validate;

const NOT_FOUND: u16 = 404;

#[derive(Default, Debug)]
pub struct ContainerCreationService {}

impl ContainerCreationService {
    #[instrument(skip_all, err)]
    pub async fn create(
        docker: &Docker,
        spec: &CreateContainerSpec,
        start: bool,
    ) -> Result<CreatedContainer, CreateContainerError> {
        validate(spec).map_err(|problems| format!("Invalid container settings: {problems}"))?;

        let (options, body) = create_request(spec);
        let created = docker
            .create_container(Some(options), body)
            .await
            .map_err(|e| docker_message(&e))?;
        debug!("Created container {}", created.id);

        if start {
            if let Err(start_error) = docker.start_container(&created.id, None).await {
                return Err(Self::discard_unstartable(docker, &created.id, &start_error).await);
            }
            debug!("Started container {}", created.id);
        }

        Ok(CreatedContainer {
            id: created.id,
            started: start,
            warnings: created.warnings,
        })
    }

    async fn discard_unstartable(
        docker: &Docker,
        id: &str,
        start_error: &DockerError,
    ) -> CreateContainerError {
        let options = RemoveContainerOptions {
            force: true,
            v: true,
            link: false,
        };
        let removed = match docker.remove_container(id, Some(options)).await {
            Ok(()) => true,
            Err(e) if status_code(&e) == Some(NOT_FOUND) => true,
            Err(e) => {
                warn!("Could not remove container {id} that failed to start: {e}");
                false
            }
        };
        CreateContainerError::NotStarted {
            message: docker_message(start_error),
            removed,
        }
    }
}

fn docker_message(error: &DockerError) -> String {
    match error {
        DockerError::DockerResponseServerError { message, .. } => message.clone(),
        other => other.to_string(),
    }
}

fn status_code(error: &DockerError) -> Option<u16> {
    match error {
        DockerError::DockerResponseServerError { status_code, .. } => Some(*status_code),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::{KeyValue, PortMapping, StorageMount, StorageMountKind};
    use bollard::query_parameters::RemoveVolumeOptions;

    const E2E_IMAGE_VARIABLE: &str = "NOOKAT_E2E_IMAGE";
    const DEFAULT_E2E_IMAGE: &str = "busybox:latest";

    #[test]
    fn docker_rejections_keep_dockers_own_message() {
        let conflict = DockerError::DockerResponseServerError {
            status_code: 409,
            message: "Conflict. The container name \"/web\" is already in use".to_string(),
        };

        assert_eq!(
            docker_message(&conflict),
            "Conflict. The container name \"/web\" is already in use"
        );
        assert_eq!(status_code(&conflict), Some(409));
    }

    fn e2e_image() -> String {
        std::env::var(E2E_IMAGE_VARIABLE).unwrap_or_else(|_| DEFAULT_E2E_IMAGE.to_string())
    }

    fn e2e_name(purpose: &str) -> String {
        format!("nookat-e2e-{purpose}-{}", std::process::id())
    }

    fn local_docker() -> Docker {
        Docker::connect_with_local_defaults().expect("a local Docker engine")
    }

    async fn remove_e2e_container(docker: &Docker, name: &str) {
        let options = RemoveContainerOptions {
            force: true,
            v: true,
            link: false,
        };
        let _ = docker.remove_container(name, Some(options)).await;
    }

    #[tokio::test]
    #[ignore = "creates, inspects and removes nookat-e2e- resources on the local Docker engine"]
    async fn creates_and_starts_a_container_with_ports_env_a_named_volume_and_a_label() {
        let docker = local_docker();
        let name = e2e_name("create");
        let volume = format!("{name}-data");
        let spec = CreateContainerSpec {
            image: e2e_image(),
            name: Some(name.clone()),
            command: Some(vec!["sleep".to_string(), "300".to_string()]),
            ports: vec![PortMapping {
                container_port: 8080,
                host_ip: Some("127.0.0.1".to_string()),
                ..Default::default()
            }],
            mounts: vec![StorageMount {
                kind: StorageMountKind::Volume,
                source: volume.clone(),
                target: "/data".to_string(),
                read_only: false,
            }],
            env: vec![KeyValue {
                key: "NOOKAT_E2E".to_string(),
                value: "hello world".to_string(),
            }],
            labels: vec![KeyValue {
                key: "io.nookat.e2e".to_string(),
                value: "create".to_string(),
            }],
            ..Default::default()
        };

        let created = ContainerCreationService::create(&docker, &spec, true).await;
        let inspected = docker.inspect_container(&name, None).await;
        remove_e2e_container(&docker, &name).await;
        let _ = docker
            .remove_volume(&volume, None::<RemoveVolumeOptions>)
            .await;

        let created = created.expect("the container is created and started");
        let inspected = inspected.expect("the new container can be inspected");
        let config = inspected.config.expect("config");
        let host_config = inspected.host_config.expect("host config");
        let bindings = host_config
            .port_bindings
            .expect("port bindings")
            .remove("8080/tcp")
            .flatten()
            .expect("a binding for 8080/tcp");

        assert!(created.started);
        assert_eq!(inspected.id.as_deref(), Some(created.id.as_str()));
        assert_eq!(bindings[0].host_ip.as_deref(), Some("127.0.0.1"));
        assert!(config
            .env
            .unwrap_or_default()
            .contains(&"NOOKAT_E2E=hello world".to_string()));
        assert_eq!(
            config
                .labels
                .unwrap_or_default()
                .get("io.nookat.e2e")
                .map(String::as_str),
            Some("create")
        );
        assert!(inspected.mounts.unwrap_or_default().iter().any(|mount| {
            mount.name.as_deref() == Some(volume.as_str())
                && mount.destination.as_deref() == Some("/data")
        }));
    }

    #[tokio::test]
    #[ignore = "creates and removes a nookat-e2e- container on the local Docker engine"]
    async fn a_container_that_cannot_start_is_reported_and_removed_again() {
        let docker = local_docker();
        let name = e2e_name("unstartable");
        let spec = CreateContainerSpec {
            image: e2e_image(),
            name: Some(name.clone()),
            entrypoint: Some("/nookat-e2e-missing-binary".to_string()),
            ..Default::default()
        };

        let result = ContainerCreationService::create(&docker, &spec, true).await;
        let leftover = docker.inspect_container(&name, None).await;
        remove_e2e_container(&docker, &name).await;

        match result {
            Err(CreateContainerError::NotStarted { message, removed }) => {
                assert!(removed);
                assert!(
                    message.contains("nookat-e2e-missing-binary"),
                    "Docker's start error names the missing binary: {message}"
                );
            }
            other => panic!("expected a start failure, got {other:?}"),
        }
        assert_eq!(
            leftover.err().as_ref().and_then(status_code),
            Some(NOT_FOUND)
        );
    }
}
