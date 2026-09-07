use crate::entities::Network;
use bollard::models::Network as BollardNetwork;
use bollard::query_parameters::{ListContainersOptions, ListNetworksOptions};
use bollard::Docker;
use std::collections::HashMap;
use tracing::instrument;

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

    /// Count how many containers are attached to each network, keyed by network name.
    ///
    /// Stopped containers are included: a network that a stopped container is still
    /// attached to cannot be removed, so it has to count as in use.
    #[instrument(skip_all, err)]
    async fn count_attached_containers(docker: &Docker) -> Result<HashMap<String, i64>, String> {
        let options = ListContainersOptions {
            all: true,
            ..Default::default()
        };

        let containers = docker
            .list_containers(Some(options))
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
    pub async fn remove_network(docker: &Docker, name: &str) -> Result<(), String> {
        // Validate network name
        if name.trim().is_empty() {
            return Err("Network name cannot be empty".to_string());
        }

        if name.len() > 128 {
            return Err("Network name too long (max 128 characters)".to_string());
        }

        // Check for system networks (case-insensitive)
        let lower_name = name.to_lowercase();
        if lower_name == "bridge" || lower_name == "host" || lower_name == "none" {
            return Err(format!("Cannot remove system network: {}", name));
        }

        docker
            .remove_network(name)
            .await
            .map_err(|e| format!("Failed to remove network {}: {}", name, e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn bulk_remove_networks(docker: &Docker, names: &[String]) -> Result<(), String> {
        let mut errors = Vec::new();

        for name in names {
            if name.trim().is_empty() {
                errors.push("Network name cannot be empty".to_string());
                continue;
            }

            if name.len() > 128 {
                errors.push(format!(
                    "Network name too long (max 128 characters): {}",
                    name
                ));
                continue;
            }

            let lower_name = name.to_lowercase();
            if lower_name == "bridge" || lower_name == "host" || lower_name == "none" {
                errors.push(format!("Cannot remove system network: {}", name));
                continue;
            }
        }

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
