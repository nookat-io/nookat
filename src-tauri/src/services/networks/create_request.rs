use crate::entities::{IpAddressing, NetworkCreateOptions, NetworkLabel};
use bollard::models::{Ipam, IpamConfig, NetworkCreateRequest};
use ipnet::IpNet;
use std::collections::HashMap;
use std::fmt;
use std::net::IpAddr;

pub(super) const MAX_NETWORK_NAME_LENGTH: usize = 128;
const RESERVED_NETWORK_NAMES: [&str; 5] = ["bridge", "host", "none", "default", "container"];
const MAX_INTERFACE_NAME_LENGTH: usize = 15;
const PARENT_INTERFACE_OPTION: &str = "parent";

#[derive(Clone, Copy)]
enum IpFamily {
    V4,
    V6,
}

impl IpFamily {
    fn includes(self, address: IpAddr) -> bool {
        matches!(
            (self, address),
            (IpFamily::V4, IpAddr::V4(_)) | (IpFamily::V6, IpAddr::V6(_))
        )
    }

    fn example_block(self) -> &'static str {
        match self {
            IpFamily::V4 => "172.20.0.0/16",
            IpFamily::V6 => "fd00:1::/64",
        }
    }

    fn example_address(self) -> &'static str {
        match self {
            IpFamily::V4 => "172.20.0.1",
            IpFamily::V6 => "fd00:1::1",
        }
    }
}

impl fmt::Display for IpFamily {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            IpFamily::V4 => "IPv4",
            IpFamily::V6 => "IPv6",
        })
    }
}

pub(super) fn network_create_request(
    options: &NetworkCreateOptions,
) -> Result<NetworkCreateRequest, String> {
    validate_network_name(&options.name)?;
    let driver_options = driver_options(options)?;

    if !options.ipv4.enabled && !options.ipv6.enabled {
        return Err("Enable IPv4, IPv6 or both".to_string());
    }
    let ipam_configs: Vec<IpamConfig> = [
        ipam_config(&options.ipv4, IpFamily::V4)?,
        ipam_config(&options.ipv6, IpFamily::V6)?,
    ]
    .into_iter()
    .flatten()
    .collect();

    let labels = labels_by_key(&options.labels)?;

    Ok(NetworkCreateRequest {
        name: options.name.clone(),
        driver: Some(options.driver.name().to_string()),
        internal: Some(options.internal),
        attachable: Some(options.attachable),
        enable_ipv4: Some(options.ipv4.enabled),
        enable_ipv6: Some(options.ipv6.enabled),
        ipam: (!ipam_configs.is_empty()).then(|| Ipam {
            config: Some(ipam_configs),
            ..Default::default()
        }),
        options: driver_options,
        labels: (!labels.is_empty()).then_some(labels),
        ..Default::default()
    })
}

fn validate_network_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Network name is required".to_string());
    }
    if name.len() > MAX_NETWORK_NAME_LENGTH {
        return Err(format!(
            "Network name must be at most {MAX_NETWORK_NAME_LENGTH} characters"
        ));
    }
    if !uses_docker_name_characters(name) {
        return Err(
            "Network name must start with a letter or digit and use only letters, digits, '_', '.' and '-'"
                .to_string(),
        );
    }
    if RESERVED_NETWORK_NAMES.contains(&name.to_lowercase().as_str()) {
        return Err(format!("\"{name}\" is reserved by Docker"));
    }
    Ok(())
}

fn uses_docker_name_characters(name: &str) -> bool {
    let mut characters = name.chars();
    characters
        .next()
        .is_some_and(|first| first.is_ascii_alphanumeric())
        && characters.all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '_' | '.' | '-')
        })
}

fn driver_options(
    options: &NetworkCreateOptions,
) -> Result<Option<HashMap<String, String>>, String> {
    let Some(parent) = &options.parent_interface else {
        return Ok(None);
    };
    if !options.driver.attaches_to_a_parent_interface() {
        return Err("Parent interface only applies to macvlan and ipvlan networks".to_string());
    }
    if !is_interface_name(parent) {
        return Err(format!(
            "Parent interface must be a Linux interface name: up to {MAX_INTERFACE_NAME_LENGTH} characters, no spaces, '/' or ':'"
        ));
    }
    Ok(Some(HashMap::from([(
        PARENT_INTERFACE_OPTION.to_string(),
        parent.clone(),
    )])))
}

fn is_interface_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= MAX_INTERFACE_NAME_LENGTH
        && name != "."
        && name != ".."
        && !name
            .chars()
            .any(|character| character == '/' || character == ':' || character.is_whitespace())
}

fn ipam_config(addressing: &IpAddressing, family: IpFamily) -> Result<Option<IpamConfig>, String> {
    let IpAddressing {
        enabled,
        subnet,
        gateway,
        ip_range,
    } = addressing;

    if !enabled {
        let has_addressing = subnet.is_some() || gateway.is_some() || ip_range.is_some();
        return match has_addressing {
            true => Err(format!("{family} addressing needs {family} enabled")),
            false => Ok(None),
        };
    }

    let Some(subnet) = subnet else {
        if gateway.is_some() {
            return Err(format!("{family} gateway needs a subnet"));
        }
        if ip_range.is_some() {
            return Err(format!("{family} IP range needs a subnet"));
        }
        return Ok(None);
    };

    let subnet = address_block(subnet, family, "subnet")?;
    let gateway = gateway
        .as_deref()
        .map(|gateway| gateway_inside(gateway, &subnet, family))
        .transpose()?;
    let ip_range = ip_range
        .as_deref()
        .map(|ip_range| ip_range_inside(ip_range, &subnet, family))
        .transpose()?;

    Ok(Some(IpamConfig {
        subnet: Some(subnet.to_string()),
        gateway: gateway.map(|gateway| gateway.to_string()),
        ip_range: ip_range.map(|ip_range| ip_range.to_string()),
        ..Default::default()
    }))
}

fn address_block(text: &str, family: IpFamily, field: &str) -> Result<IpNet, String> {
    let block = text
        .parse::<IpNet>()
        .ok()
        .filter(|block| family.includes(block.addr()))
        .ok_or_else(|| {
            format!(
                "{family} {field} must be an {family} CIDR block, like {}",
                family.example_block()
            )
        })?;

    if block != block.trunc() {
        return Err(format!(
            "{family} {field} has host bits set; use {}",
            block.trunc()
        ));
    }
    Ok(block)
}

fn gateway_inside(text: &str, subnet: &IpNet, family: IpFamily) -> Result<IpAddr, String> {
    let gateway = text
        .parse::<IpAddr>()
        .ok()
        .filter(|gateway| family.includes(*gateway))
        .ok_or_else(|| {
            format!(
                "{family} gateway must be an {family} address, like {}",
                family.example_address()
            )
        })?;

    if !subnet.contains(&gateway) {
        return Err(format!("{family} gateway must be inside {subnet}"));
    }
    Ok(gateway)
}

fn ip_range_inside(text: &str, subnet: &IpNet, family: IpFamily) -> Result<IpNet, String> {
    let ip_range = address_block(text, family, "IP range")?;

    if !subnet.contains(&ip_range) {
        return Err(format!("{family} IP range must be inside {subnet}"));
    }
    Ok(ip_range)
}

fn labels_by_key(labels: &[NetworkLabel]) -> Result<HashMap<String, String>, String> {
    let mut by_key = HashMap::new();
    for NetworkLabel { key, value } in labels {
        if key.trim().is_empty() {
            return Err("Label key is required".to_string());
        }
        if by_key.insert(key.clone(), value.clone()).is_some() {
            return Err(format!("Label key \"{key}\" is used more than once"));
        }
    }
    Ok(by_key)
}

#[cfg(test)]
mod tests {
    use super::network_create_request;
    use crate::entities::{IpAddressing, NetworkCreateOptions, NetworkDriver, NetworkLabel};
    use bollard::models::{Ipam, IpamConfig, NetworkCreateRequest};
    use std::collections::HashMap;

    fn ipv4_only() -> IpAddressing {
        IpAddressing {
            enabled: true,
            ..Default::default()
        }
    }

    fn named(name: &str) -> NetworkCreateOptions {
        NetworkCreateOptions {
            name: name.to_string(),
            driver: NetworkDriver::Bridge,
            parent_interface: None,
            internal: false,
            attachable: false,
            ipv4: ipv4_only(),
            ipv6: IpAddressing::default(),
            labels: Vec::new(),
        }
    }

    fn ipv4(subnet: &str, gateway: Option<&str>, ip_range: Option<&str>) -> IpAddressing {
        IpAddressing {
            enabled: true,
            subnet: Some(subnet.to_string()),
            gateway: gateway.map(str::to_string),
            ip_range: ip_range.map(str::to_string),
        }
    }

    fn label(key: &str, value: &str) -> NetworkLabel {
        NetworkLabel {
            key: key.to_string(),
            value: value.to_string(),
        }
    }

    fn rejection(options: NetworkCreateOptions) -> String {
        network_create_request(&options).expect_err("the options should be rejected")
    }

    #[test]
    fn a_plain_bridge_network_only_names_its_driver_and_address_families() {
        let request = network_create_request(&named("backend")).unwrap();

        assert_eq!(
            request,
            NetworkCreateRequest {
                name: "backend".to_string(),
                driver: Some("bridge".to_string()),
                internal: Some(false),
                attachable: Some(false),
                enable_ipv4: Some(true),
                enable_ipv6: Some(false),
                ..Default::default()
            }
        );
    }

    #[test]
    fn every_option_reaches_the_docker_request() {
        let options = NetworkCreateOptions {
            driver: NetworkDriver::Macvlan,
            parent_interface: Some("eth0.10".to_string()),
            internal: true,
            attachable: true,
            ipv4: ipv4("172.20.0.0/16", Some("172.20.0.1"), Some("172.20.10.0/24")),
            ipv6: IpAddressing {
                enabled: true,
                subnet: Some("fd00:1::/64".to_string()),
                gateway: Some("fd00:1::1".to_string()),
                ip_range: None,
            },
            labels: vec![label("com.example.team", "payments"), label("tier", "")],
            ..named("payments")
        };

        let request = network_create_request(&options).unwrap();

        assert_eq!(
            request,
            NetworkCreateRequest {
                name: "payments".to_string(),
                driver: Some("macvlan".to_string()),
                internal: Some(true),
                attachable: Some(true),
                enable_ipv4: Some(true),
                enable_ipv6: Some(true),
                ipam: Some(Ipam {
                    config: Some(vec![
                        IpamConfig {
                            subnet: Some("172.20.0.0/16".to_string()),
                            gateway: Some("172.20.0.1".to_string()),
                            ip_range: Some("172.20.10.0/24".to_string()),
                            ..Default::default()
                        },
                        IpamConfig {
                            subnet: Some("fd00:1::/64".to_string()),
                            gateway: Some("fd00:1::1".to_string()),
                            ..Default::default()
                        },
                    ]),
                    ..Default::default()
                }),
                options: Some(HashMap::from([(
                    "parent".to_string(),
                    "eth0.10".to_string()
                )])),
                labels: Some(HashMap::from([
                    ("com.example.team".to_string(), "payments".to_string()),
                    ("tier".to_string(), String::new()),
                ])),
                ..Default::default()
            }
        );
    }

    #[test]
    fn an_ipv6_only_network_disables_ipv4() {
        let options = NetworkCreateOptions {
            ipv4: IpAddressing::default(),
            ipv6: IpAddressing {
                enabled: true,
                ..Default::default()
            },
            ..named("v6")
        };

        let request = network_create_request(&options).unwrap();

        assert_eq!(request.enable_ipv4, Some(false));
        assert_eq!(request.enable_ipv6, Some(true));
        assert_eq!(request.ipam, None);
    }

    #[test]
    fn ipv6_addresses_are_sent_in_their_canonical_form() {
        let options = NetworkCreateOptions {
            ipv6: IpAddressing {
                enabled: true,
                subnet: Some("FD00:0001:0000::/64".to_string()),
                gateway: None,
                ip_range: None,
            },
            ..named("v6")
        };

        let request = network_create_request(&options).unwrap();
        let config = request.ipam.and_then(|ipam| ipam.config).unwrap();

        assert_eq!(config[0].subnet.as_deref(), Some("fd00:1::/64"));
    }

    #[test]
    fn names_follow_the_characters_docker_allows_for_object_names() {
        for name in ["a", "backend", "my-app_default", "app.v2", "9lives"] {
            assert!(network_create_request(&named(name)).is_ok(), "{name}");
        }

        let character_rule = "Network name must start with a letter or digit and use only letters, digits, '_', '.' and '-'";
        for name in [
            "-backend",
            ".hidden",
            "_private",
            "my app",
            "a/b",
            "container:web",
            "café",
        ] {
            assert_eq!(rejection(named(name)), character_rule, "{name}");
        }
    }

    #[test]
    fn blank_and_overlong_names_are_rejected() {
        assert_eq!(rejection(named("")), "Network name is required");
        assert_eq!(
            rejection(named(&"n".repeat(129))),
            "Network name must be at most 128 characters"
        );
        assert!(network_create_request(&named(&"n".repeat(128))).is_ok());
    }

    #[test]
    fn names_docker_reserves_are_rejected_in_any_letter_case() {
        for name in [
            "bridge",
            "host",
            "none",
            "default",
            "container",
            "Bridge",
            "HOST",
        ] {
            assert_eq!(
                rejection(named(name)),
                format!("\"{name}\" is reserved by Docker")
            );
        }
    }

    #[test]
    fn a_network_needs_at_least_one_address_family() {
        let options = NetworkCreateOptions {
            ipv4: IpAddressing::default(),
            ..named("dark")
        };

        assert_eq!(rejection(options), "Enable IPv4, IPv6 or both");
    }

    #[test]
    fn addressing_for_a_disabled_family_is_rejected() {
        let options = NetworkCreateOptions {
            ipv6: IpAddressing {
                enabled: false,
                subnet: Some("fd00:1::/64".to_string()),
                gateway: None,
                ip_range: None,
            },
            ..named("v4")
        };

        assert_eq!(rejection(options), "IPv6 addressing needs IPv6 enabled");
    }

    #[test]
    fn subnets_must_be_cidr_blocks_of_their_own_family() {
        let cases = [
            (
                "172.20.0.0",
                "IPv4 subnet must be an IPv4 CIDR block, like 172.20.0.0/16",
            ),
            (
                "172.20.0.0/33",
                "IPv4 subnet must be an IPv4 CIDR block, like 172.20.0.0/16",
            ),
            (
                "172.20.0/16",
                "IPv4 subnet must be an IPv4 CIDR block, like 172.20.0.0/16",
            ),
            (
                "fd00:1::/64",
                "IPv4 subnet must be an IPv4 CIDR block, like 172.20.0.0/16",
            ),
            (
                "172.20.0.1/16",
                "IPv4 subnet has host bits set; use 172.20.0.0/16",
            ),
        ];
        for (subnet, expected) in cases {
            let options = NetworkCreateOptions {
                ipv4: ipv4(subnet, None, None),
                ..named("net")
            };
            assert_eq!(rejection(options), expected, "{subnet}");
        }

        let options = NetworkCreateOptions {
            ipv6: IpAddressing {
                enabled: true,
                subnet: Some("172.20.0.0/16".to_string()),
                gateway: None,
                ip_range: None,
            },
            ..named("net")
        };
        assert_eq!(
            rejection(options),
            "IPv6 subnet must be an IPv6 CIDR block, like fd00:1::/64"
        );
    }

    #[test]
    fn a_gateway_must_be_an_address_inside_the_subnet() {
        let cases = [
            (
                "172.20.0.300",
                "IPv4 gateway must be an IPv4 address, like 172.20.0.1",
            ),
            (
                "fd00:1::1",
                "IPv4 gateway must be an IPv4 address, like 172.20.0.1",
            ),
            ("172.21.0.1", "IPv4 gateway must be inside 172.20.0.0/16"),
        ];
        for (gateway, expected) in cases {
            let options = NetworkCreateOptions {
                ipv4: ipv4("172.20.0.0/16", Some(gateway), None),
                ..named("net")
            };
            assert_eq!(rejection(options), expected, "{gateway}");
        }
    }

    #[test]
    fn an_ip_range_must_be_a_block_inside_the_subnet() {
        let cases = [
            (
                "172.20.10.0",
                "IPv4 IP range must be an IPv4 CIDR block, like 172.20.0.0/16",
            ),
            (
                "172.20.10.1/24",
                "IPv4 IP range has host bits set; use 172.20.10.0/24",
            ),
            ("172.0.0.0/8", "IPv4 IP range must be inside 172.20.0.0/16"),
            (
                "172.21.0.0/24",
                "IPv4 IP range must be inside 172.20.0.0/16",
            ),
        ];
        for (ip_range, expected) in cases {
            let options = NetworkCreateOptions {
                ipv4: ipv4("172.20.0.0/16", None, Some(ip_range)),
                ..named("net")
            };
            assert_eq!(rejection(options), expected, "{ip_range}");
        }
    }

    #[test]
    fn a_gateway_or_ip_range_needs_a_subnet() {
        let without_subnet = |gateway: Option<&str>, ip_range: Option<&str>| NetworkCreateOptions {
            ipv4: IpAddressing {
                enabled: true,
                subnet: None,
                gateway: gateway.map(str::to_string),
                ip_range: ip_range.map(str::to_string),
            },
            ..named("net")
        };

        assert_eq!(
            rejection(without_subnet(Some("172.20.0.1"), None)),
            "IPv4 gateway needs a subnet"
        );
        assert_eq!(
            rejection(without_subnet(None, Some("172.20.10.0/24"))),
            "IPv4 IP range needs a subnet"
        );
    }

    #[test]
    fn a_parent_interface_only_applies_to_macvlan_and_ipvlan() {
        let on = |driver: NetworkDriver, parent: &str| NetworkCreateOptions {
            driver,
            parent_interface: Some(parent.to_string()),
            ..named("lan")
        };

        assert!(network_create_request(&on(NetworkDriver::Ipvlan, "enp0s1")).is_ok());
        assert_eq!(
            rejection(on(NetworkDriver::Bridge, "eth0")),
            "Parent interface only applies to macvlan and ipvlan networks"
        );

        let interface_rule = "Parent interface must be a Linux interface name: up to 15 characters, no spaces, '/' or ':'";
        for parent in [
            "",
            "eth 0",
            "eth0/1",
            "eth0:1",
            "..",
            "a-very-long-interface",
        ] {
            assert_eq!(
                rejection(on(NetworkDriver::Macvlan, parent)),
                interface_rule,
                "{parent}"
            );
        }
    }

    #[test]
    fn label_keys_must_be_present_and_unique() {
        let with_labels = |labels: Vec<NetworkLabel>| NetworkCreateOptions {
            labels,
            ..named("net")
        };

        assert_eq!(
            rejection(with_labels(vec![label(" ", "value")])),
            "Label key is required"
        );
        assert_eq!(
            rejection(with_labels(vec![label("team", "a"), label("team", "b")])),
            "Label key \"team\" is used more than once"
        );
    }
}
