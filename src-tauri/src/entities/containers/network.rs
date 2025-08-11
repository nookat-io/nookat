use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Summary of the container's network settings
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ContainerNetworkSettings {
    /// Summary of network-settings for each network the container is attached to.
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

/// EndpointIPAMConfig represents an endpoint's IPAM configuration.
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

/// Configuration for a network endpoint.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct EndpointSettings {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ipam_config: Option<EndpointIpamConfig>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub links: Option<Vec<String>>,

    /// MAC address for the endpoint on this network.
    /// The network driver might ignore this parameter.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mac_address: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub aliases: Option<Vec<String>>,

    /// DriverOpts is a mapping of driver options and values.
    /// These options are passed directly to the driver and are driver specific.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub driver_opts: Option<HashMap<String, String>>,

    // This property determines which endpoint will provide the default
    // gateway for a container. The endpoint with the highest priority will
    // be used. If multiple endpoints have the same priority, endpoints are
    // lexicographically sorted based on their network name, and the one that
    // sorts first is picked.
    // #[serde(skip_serializing_if = "Option::is_none")]
    // pub gw_priority: Option<f64>,
    /// Unique ID of the network.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_id: Option<String>,

    /// Unique ID for the service endpoint in a Sandbox.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoint_id: Option<String>,

    /// Gateway address for this network.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gateway: Option<String>,

    /// IPv4 address.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_address: Option<String>,

    /// Mask length of the IPv4 address.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ip_prefix_len: Option<i64>,

    /// IPv6 gateway address.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ipv6_gateway: Option<String>,

    /// Global IPv6 address.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub global_ipv6_address: Option<String>,

    /// Mask length of the global IPv6 address.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub global_ipv6_prefix_len: Option<i64>,

    /// List of all DNS names an endpoint has on a specific network.
    /// This list is based on the container name, network aliases,
    /// container short ID, and hostname.  These DNS names are non-fully
    /// qualified but can contain several dots. You can get fully qualified
    /// DNS names by appending `.<network-name>`. For instance, if container
    /// name is `my.ctr` and the network is named `testnet`, `DNSNames`
    /// will contain `my.ctr` and the FQDN will be `my.ctr.testnet`.
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
            // gw_priority: endpoint_settings.gw_priority,
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
