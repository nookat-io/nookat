use bollard::models::Network as BollardNetwork;
use bollard::network::ListNetworksOptions;
use bollard::Docker;
use crate::entities::Network;

#[derive(Default, Debug)]
pub struct NetworksService {}

impl NetworksService {
    pub async fn get_networks(&self) -> Result<Vec<Network>, Box<dyn std::error::Error>> {
        let docker = Docker::connect_with_local_defaults()
            .map_err(|e| format!("Failed to connect to Docker: {}", e))?;

        let options: ListNetworksOptions<String> = ListNetworksOptions::default();

        let bollard_networks: Vec<BollardNetwork> =
            docker.list_networks(Some(options))
                .await
                .map_err(|e| format!("Failed to list networks: {}", e))?;

        // Convert Bollard networks to our custom Network type
        Ok(bollard_networks
            .into_iter()
            .map(Network::from)
            .collect())
    }

    pub async fn remove_network(&self, name: &str) -> Result<(), Box<dyn std::error::Error>> {
        // Validate network name
        if name.trim().is_empty() {
            return Err("Network name cannot be empty".into());
        }

        if name.len() > 128 {
            return Err("Network name too long (max 128 characters)".into());
        }

        // Check for system networks (case-insensitive)
        let lower_name = name.to_lowercase();
        if lower_name == "bridge" || lower_name == "host" || lower_name == "none" {
            return Err(format!("Cannot remove system network: {}", name).into());
        }

        let docker = Docker::connect_with_local_defaults()
            .map_err(|e| format!("Failed to connect to Docker: {}", e))?;

        docker.remove_network(name)
            .await
            .map_err(|e| format!("Failed to remove network {}: {}", name, e))?;

        Ok(())
    }

    pub async fn bulk_remove_networks(&self, names: &[String]) -> Result<(), String> {
        let mut errors = Vec::new();
        for name in names {
            // Validate network name
            if name.trim().is_empty() {
                errors.push(format!("Network name cannot be empty"));
                continue;
            }

            if name.len() > 128 {
                errors.push(format!("Network name too long (max 128 characters): {}", name));
                continue;
            }

            // Check for system networks (case-insensitive)
            let lower_name = name.to_lowercase();
            if lower_name == "bridge" || lower_name == "host" || lower_name == "none" {
                errors.push(format!("Cannot remove system network: {}", name));
                continue;
            }

            let docker = Docker::connect_with_local_defaults()
                .map_err(|e| format!("Failed to connect to Docker: {}", e))?;
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
