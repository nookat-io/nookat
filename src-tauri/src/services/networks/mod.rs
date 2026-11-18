mod create_request;

use crate::entities::{Network, NetworkCreateOptions};
use bollard::errors::Error as DockerError;
use bollard::models::Network as BollardNetwork;
use bollard::query_parameters::{ListContainersOptions, ListNetworksOptions};
use bollard::Docker;
use create_request::{network_create_request, MAX_NETWORK_NAME_LENGTH};
use std::collections::HashMap;
use tracing::instrument;

const SYSTEM_NETWORKS: [&str; 3] = ["bridge", "host", "none"];

#[derive(Default, Debug)]
pub struct NetworksService {}

impl NetworksService {
    #[instrument(skip_all, err)]
    pub async fn get_networks(docker: &Docker) -> Result<Vec<Network>, String> {
        let options = ListNetworksOptions::default();

        let bollard_networks: Vec<BollardNetwork> = docker
            .list_networks(Some(options))
            .await
            .map_err(|e| format!("Failed to list networks: {}", e))?;

        let attached_counts = Self::count_attached_containers(docker).await?;

        Ok(bollard_networks
            .into_iter()
            .map(|network| {
                let attached = network
                    .name
                    .as_deref()
                    .and_then(|name| attached_counts.get(name).copied())
                    .unwrap_or(0);
                Network::from_summary(network, attached)
            })
            .collect())
    }

    #[instrument(skip_all, err)]
    async fn count_attached_containers(docker: &Docker) -> Result<HashMap<String, i64>, String> {
        let running_and_stopped_containers = ListContainersOptions {
            all: true,
            ..Default::default()
        };

        let containers = docker
            .list_containers(Some(running_and_stopped_containers))
            .await
            .map_err(|e| format!("Failed to list containers: {}", e))?;

        let mut counts: HashMap<String, i64> = HashMap::new();
        for container in containers {
            let Some(networks) = container
                .network_settings
                .and_then(|settings| settings.networks)
            else {
                continue;
            };

            for network_name in networks.into_keys() {
                *counts.entry(network_name).or_insert(0) += 1;
            }
        }

        Ok(counts)
    }

    #[instrument(skip_all, err)]
    pub async fn create_network(
        docker: &Docker,
        options: &NetworkCreateOptions,
    ) -> Result<(), String> {
        let request = network_create_request(options)?;
        ensure_name_is_free(docker, &request.name).await?;

        docker.create_network(request).await.map_err(|e| {
            format!(
                "Failed to create network {}: {}",
                options.name,
                docker_message(e)
            )
        })?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn remove_network(docker: &Docker, name: &str) -> Result<(), String> {
        ensure_removable(name)?;

        docker
            .remove_network(name)
            .await
            .map_err(|e| format!("Failed to remove network {}: {}", name, e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn bulk_remove_networks(docker: &Docker, names: &[String]) -> Result<(), String> {
        let mut errors: Vec<String> = names
            .iter()
            .filter_map(|name| ensure_removable(name).err())
            .collect();

        if !errors.is_empty() {
            return Err(errors.join("; "));
        }

        for name in names {
            if let Err(e) = docker.remove_network(name).await {
                errors.push(format!("Failed to remove network {}: {}", name, e));
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors.join("; "))
        }
    }
}

#[instrument(skip_all, err)]
async fn ensure_name_is_free(docker: &Docker, name: &str) -> Result<(), String> {
    let networks_matching_the_name = ListNetworksOptions {
        filters: Some(HashMap::from([(
            "name".to_string(),
            vec![name.to_string()],
        )])),
    };

    let networks = docker
        .list_networks(Some(networks_matching_the_name))
        .await
        .map_err(|e| format!("Failed to list networks: {}", e))?;

    if networks
        .iter()
        .any(|network| network.name.as_deref() == Some(name))
    {
        return Err(format!("A network named \"{name}\" already exists"));
    }
    Ok(())
}

fn docker_message(error: DockerError) -> String {
    match error {
        DockerError::DockerResponseServerError { message, .. } => message,
        other => other.to_string(),
    }
}

fn ensure_removable(name: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Network name cannot be empty".to_string());
    }

    if name.len() > MAX_NETWORK_NAME_LENGTH {
        return Err(format!(
            "Network name too long (max {} characters): {}",
            MAX_NETWORK_NAME_LENGTH, name
        ));
    }

    if SYSTEM_NETWORKS.contains(&name.to_lowercase().as_str()) {
        return Err(format!("Cannot remove system network: {}", name));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{ensure_removable, NetworksService};
    use crate::entities::{IpAddressing, NetworkCreateOptions, NetworkDriver, NetworkLabel};
    use bollard::models::IpamConfig;
    use bollard::Docker;
    use std::collections::HashMap;

    #[test]
    fn a_user_network_can_be_removed() {
        assert!(ensure_removable("my-app_default").is_ok());
    }

    #[test]
    fn system_networks_cannot_be_removed_in_any_letter_case() {
        for name in ["bridge", "HOST", "None"] {
            assert!(ensure_removable(name).is_err(), "{name}");
        }
    }

    #[test]
    fn blank_and_overlong_names_are_rejected() {
        assert!(ensure_removable("  ").is_err());
        assert!(ensure_removable(&"n".repeat(129)).is_err());
    }

    #[tokio::test]
    #[ignore = "creates and removes a nookat-e2e- network on the local Docker engine"]
    async fn creates_a_network_with_a_subnet_and_labels_on_the_local_engine() {
        let docker = Docker::connect_with_local_defaults().expect("a local Docker engine");
        let name = format!("nookat-e2e-create-network-{}", std::process::id());
        let options = NetworkCreateOptions {
            name: name.clone(),
            driver: NetworkDriver::Bridge,
            parent_interface: None,
            internal: true,
            attachable: false,
            ipv4: IpAddressing {
                enabled: true,
                subnet: Some("10.213.47.0/24".to_string()),
                gateway: Some("10.213.47.1".to_string()),
                ip_range: Some("10.213.47.128/25".to_string()),
            },
            ipv6: IpAddressing::default(),
            labels: vec![NetworkLabel {
                key: "io.nookat.e2e".to_string(),
                value: "create-network".to_string(),
            }],
        };

        let created = NetworksService::create_network(&docker, &options).await;
        let created_again = NetworksService::create_network(&docker, &options).await;
        let inspected = docker.inspect_network(&name, None).await;
        let removed = docker.remove_network(&name).await;

        created.expect("the network is created");
        removed.expect("the network is removed");
        let network = inspected.expect("the network is inspected");
        assert_eq!(
            created_again,
            Err(format!("A network named \"{name}\" already exists"))
        );
        assert_eq!(network.driver.as_deref(), Some("bridge"));
        assert_eq!(network.internal, Some(true));
        assert_eq!(
            network.labels,
            Some(HashMap::from([(
                "io.nookat.e2e".to_string(),
                "create-network".to_string()
            )]))
        );
        assert_eq!(
            network.ipam.and_then(|ipam| ipam.config),
            Some(vec![IpamConfig {
                subnet: Some("10.213.47.0/24".to_string()),
                gateway: Some("10.213.47.1".to_string()),
                ip_range: Some("10.213.47.128/25".to_string()),
                ..Default::default()
            }])
        );
    }
}
