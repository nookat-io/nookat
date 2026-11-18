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

#[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum NetworkDriver {
    Bridge,
    Macvlan,
    Ipvlan,
}

impl NetworkDriver {
    pub fn name(self) -> &'static str {
        match self {
            NetworkDriver::Bridge => "bridge",
            NetworkDriver::Macvlan => "macvlan",
            NetworkDriver::Ipvlan => "ipvlan",
        }
    }

    pub fn attaches_to_a_parent_interface(self) -> bool {
        matches!(self, NetworkDriver::Macvlan | NetworkDriver::Ipvlan)
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, Default, PartialEq, Eq)]
pub struct IpAddressing {
    pub enabled: bool,
    pub subnet: Option<String>,
    pub gateway: Option<String>,
    pub ip_range: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct NetworkLabel {
    pub key: String,
    pub value: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
pub struct NetworkCreateOptions {
    pub name: String,
    pub driver: NetworkDriver,
    pub parent_interface: Option<String>,
    pub internal: bool,
    pub attachable: bool,
    pub ipv4: IpAddressing,
    pub ipv6: IpAddressing,
    pub labels: Vec<NetworkLabel>,
}

impl Network {
    pub fn from_summary(network: bollard::models::Network, attached_container_count: i64) -> Self {
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
            containers: attached_container_count,
            internal: network.internal.unwrap_or(false),
            ipam: Ipam {
                driver: network.ipam.as_ref().and_then(|i| i.driver.clone()),
                config: ipam_config,
            },
            labels: network.labels,
        }
    }
}
