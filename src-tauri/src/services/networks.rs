use crate::entities::{Engine, Network};
use bollard::models::Network as BollardNetwork;
use bollard::network::ListNetworksOptions;
use tracing::instrument;

#[derive(Default, Debug)]
pub struct NetworksService {}

impl NetworksService {
    #[instrument(skip_all, err)]
    pub async fn get_networks(engine: &Engine) -> Result<Vec<Network>, String> {
        let options: ListNetworksOptions<String> = ListNetworksOptions::default();

        let bollard_networks: Vec<BollardNetwork> = engine.docker.as_ref().ok_or("Docker not found")?
            .list_networks(Some(options))
            .await
            .map_err(|e| format!("Failed to list networks: {}", e))?;

        // Convert Bollard networks to our custom Network type
        Ok(bollard_networks.into_iter().map(Network::from).collect())
    }

    #[instrument(skip_all, err)]
    pub async fn remove_network(engine: &Engine, name: &str) -> Result<(), String> {
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

        engine.docker.as_ref().ok_or("Docker not found")?
            .remove_network(name)
            .await
            .map_err(|e| format!("Failed to remove network {}: {}", name, e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn bulk_remove_networks(engine: &Engine, names: &[String]) -> Result<(), String> {
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
            if let Err(e) = engine.docker.as_ref().ok_or("Docker not found")?.remove_network(name).await {
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
