use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ContainerNetworkSettings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub networks: Option<HashMap<String, EndpointSettings>>,
}

impl From<bollard::models::ContainerSummaryNetworkSettings> for ContainerNetworkSettings {
    fn from(network_settings: bollard::models::ContainerSummaryNetworkSettings) -> Self {
        ContainerNetworkSettings {
            networks: network_settings.networks.map(|networks| {
                networks
                    .into_iter()
                    .map(|(key, value)| (key, value.into()))
                    .collect()
            }),
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct EndpointIpamConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ipv4_address: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub ipv6_address: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub link_local_ips: Option<Vec<String>>,
}

impl From<bollard::models::EndpointIpamConfig> for EndpointIpamConfig {
    fn from(ipam_config: bollard::models::EndpointIpamConfig) -> Self {
        EndpointIpamConfig {
            ipv4_address: ipam_config.ipv4_address,
            ipv6_address: ipam_config.ipv6_address,
            link_local_ips: ipam_config.link_local_ips,
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct EndpointSettings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ipam_config: Option<EndpointIpamConfig>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub links: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub mac_address: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub aliases: Option<Vec<String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub driver_opts: Option<HashMap<String, String>>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_id: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoint_id: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub gateway: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_address: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_prefix_len: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub ipv6_gateway: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub global_ipv6_address: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub global_ipv6_prefix_len: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub dns_names: Option<Vec<String>>,
}

impl From<bollard::models::EndpointSettings> for EndpointSettings {
    fn from(endpoint_settings: bollard::models::EndpointSettings) -> Self {
        EndpointSettings {
            ipam_config: endpoint_settings
                .ipam_config
                .map(|ipam_config| ipam_config.into()),
            links: endpoint_settings.links,
            mac_address: endpoint_settings.mac_address,
            aliases: endpoint_settings.aliases,
            driver_opts: endpoint_settings.driver_opts,
            network_id: endpoint_settings.network_id,
            endpoint_id: endpoint_settings.endpoint_id,
            gateway: endpoint_settings.gateway,
            ip_address: endpoint_settings.ip_address,
            ip_prefix_len: endpoint_settings.ip_prefix_len,
            ipv6_gateway: endpoint_settings.ipv6_gateway,
            global_ipv6_address: endpoint_settings.global_ipv6_address,
            global_ipv6_prefix_len: endpoint_settings.global_ipv6_prefix_len,
            dns_names: endpoint_settings.dns_names,
        }
    }
}
