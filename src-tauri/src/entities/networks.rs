use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Network {
    pub id: String,
    pub name: String,
    pub driver: String,
    pub scope: String,
    pub created: Option<String>,
    pub subnet: Option<String>,
    pub gateway: Option<String>,
    pub containers: i64,
    pub internal: bool,
    pub ipam: Ipam,
    pub labels: Option<HashMap<String, String>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Ipam {
    pub driver: Option<String>,
    pub config: Option<Vec<IpamConfig>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct IpamConfig {
    pub subnet: Option<String>,
    pub gateway: Option<String>,
}

impl Network {
    /// Build a `Network` from the daemon's network listing.
    ///
    /// `attached_containers` has to be supplied by the caller because the Docker
    /// API stopped returning a network's container map on the list endpoint - it
    /// is only populated by an inspect with `verbose` set. The count is what the
    /// UI uses to keep the Delete action disabled while a network is still in
    /// use, so it is derived from the container listing instead.
    pub fn from_summary(network: bollard::models::Network, attached_containers: i64) -> Self {
        let ipam_config = network.ipam.as_ref().and_then(|ipam| {
            ipam.config.as_ref().map(|configs| {
                configs
                    .iter()
                    .map(|config| IpamConfig {
                        subnet: config.subnet.clone(),
                        gateway: config.gateway.clone(),
                    })
                    .collect()
            })
        });

        let first_config = network
            .ipam
            .as_ref()
            .and_then(|ipam| ipam.config.as_ref().and_then(|configs| configs.first()));

        Network {
            id: network.id.unwrap_or_default(),
            name: network.name.unwrap_or_default(),
            driver: network.driver.unwrap_or_default(),
            scope: network.scope.unwrap_or_default(),
            created: network.created,
            subnet: first_config.as_ref().and_then(|c| c.subnet.clone()),
            gateway: first_config.as_ref().and_then(|c| c.gateway.clone()),
            containers: attached_containers,
            internal: network.internal.unwrap_or(false),
            ipam: Ipam {
                driver: network.ipam.as_ref().and_then(|i| i.driver.clone()),
                config: ipam_config,
            },
            labels: network.labels,
        }
    }
}
