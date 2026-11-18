use crate::entities::{
    CreateContainerSpec, KeyValue, PortMapping, RestartPolicy, StorageMount, StorageMountKind,
};
use std::collections::HashSet;
use std::net::IpAddr;

const MIN_CPUS: f64 = 0.01;
const MAX_CPUS: f64 = 1024.0;
const MIN_MEMORY_MB: u64 = 6;
const MAX_MEMORY_MB: u64 = 1024 * 1024;

const NETWORKS_WITHOUT_PORTS: [&str; 2] = ["host", "none"];

pub fn validate(spec: &CreateContainerSpec) -> Result<(), String> {
    let problems = problems(spec);
    if problems.is_empty() {
        Ok(())
    } else {
        Err(problems.join("; "))
    }
}

fn problems(spec: &CreateContainerSpec) -> Vec<String> {
    [
        image_problems(&spec.image),
        name_problems(spec.name.as_deref()),
        process_problems(spec),
        restart_problems(spec),
        port_problems(&spec.ports, spec.network.as_deref()),
        mount_problems(&spec.mounts),
        env_problems(&spec.env),
        label_problems(&spec.labels),
        network_problems(spec.network.as_deref()),
        resource_problems(spec.cpus, spec.memory_mb),
    ]
    .concat()
}

fn is_docker_object_name(value: &str) -> bool {
    let mut chars = value.chars();
    let starts_well = chars
        .next()
        .is_some_and(|first| first.is_ascii_alphanumeric());
    let rest = chars.as_str();
    starts_well
        && !rest.is_empty()
        && rest
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | '-'))
}

fn is_env_key(value: &str) -> bool {
    let mut chars = value.chars();
    let starts_well = chars
        .next()
        .is_some_and(|first| first.is_ascii_alphabetic() || first == '_');
    starts_well && chars.all(|c| c.is_ascii_alphanumeric() || matches!(c, '_' | '.' | '-'))
}

fn is_container_path(value: &str) -> bool {
    value.starts_with('/')
}

fn is_absolute_host_path(value: &str) -> bool {
    let mut chars = value.chars();
    let starts_with_a_windows_drive = matches!(
        (chars.next(), chars.next(), chars.next()),
        (Some(drive), Some(':'), Some('\\' | '/')) if drive.is_ascii_alphabetic()
    );
    value.starts_with('/') || value.starts_with(r"\\") || starts_with_a_windows_drive
}

fn image_problems(image: &str) -> Vec<String> {
    if image.trim().is_empty() {
        vec!["Choose an image to create the container from".to_string()]
    } else if image.chars().any(char::is_whitespace) {
        vec![format!(
            "The image reference \"{image}\" cannot contain whitespace"
        )]
    } else {
        vec![]
    }
}

fn name_problems(name: Option<&str>) -> Vec<String> {
    match name {
        Some(name) if !is_docker_object_name(name) => vec![format!(
            "Container name \"{name}\" is invalid: use at least two characters from letters, digits, '_', '.' and '-', starting with a letter or digit"
        )],
        _ => vec![],
    }
}

fn process_problems(spec: &CreateContainerSpec) -> Vec<String> {
    let mut problems = vec![];
    if spec.command.as_ref().is_some_and(Vec::is_empty) {
        problems.push(
            "The command override is empty; leave it unset to use the image default".to_string(),
        );
    }
    if spec
        .entrypoint
        .as_deref()
        .is_some_and(|entrypoint| entrypoint.trim().is_empty())
    {
        problems.push(
            "The entrypoint override is empty; leave it unset to use the image default".to_string(),
        );
    }
    if let Some(dir) = spec.working_dir.as_deref() {
        if !is_container_path(dir) {
            problems.push(format!(
                "Working directory \"{dir}\" must be an absolute path such as /app"
            ));
        }
    }
    problems
}

fn restart_problems(spec: &CreateContainerSpec) -> Vec<String> {
    let policy = match spec.restart_policy {
        RestartPolicy::No => return vec![],
        RestartPolicy::Always => "always",
        RestartPolicy::UnlessStopped => "unless-stopped",
        RestartPolicy::OnFailure { .. } => "on-failure",
    };
    if spec.auto_remove {
        vec![format!(
            "Auto-remove cannot be combined with the {policy} restart policy"
        )]
    } else {
        vec![]
    }
}

fn port_problems(ports: &[PortMapping], network: Option<&str>) -> Vec<String> {
    let mut problems = vec![];

    if let Some(network) = network.filter(|name| NETWORKS_WITHOUT_PORTS.contains(name)) {
        if !ports.is_empty() {
            problems.push(format!(
                "Port mappings cannot be used with the {network} network"
            ));
        }
    }

    for (index, port) in ports.iter().enumerate() {
        let number = index + 1;
        if port.container_port == 0 {
            problems.push(format!(
                "Port mapping {number}: the container port must be between 1 and 65535"
            ));
        }
        if port.host_port == Some(0) {
            problems.push(format!(
                "Port mapping {number}: the host port must be between 1 and 65535, or left empty for a random port"
            ));
        }
        if let Some(ip) = port.host_ip.as_deref() {
            if ip.parse::<IpAddr>().is_err() {
                problems.push(format!(
                    "Port mapping {number}: \"{ip}\" is not a valid host IP address"
                ));
            }
        }
        if let Some(earlier) = ports[..index]
            .iter()
            .position(|other| publish_the_same_host_port(other, port))
        {
            problems.push(format!(
                "Port mapping {number}: host port {}/{} is already used by port mapping {}",
                port.host_port.unwrap_or_default(),
                port.protocol,
                earlier + 1
            ));
        }
    }
    problems
}

fn publish_the_same_host_port(a: &PortMapping, b: &PortMapping) -> bool {
    a.host_port.is_some_and(|port| port != 0)
        && a.host_port == b.host_port
        && a.protocol == b.protocol
        && host_ips_overlap(a.host_ip.as_deref(), b.host_ip.as_deref())
}

fn host_ips_overlap(a: Option<&str>, b: Option<&str>) -> bool {
    match (parse_host_ip(a), parse_host_ip(b)) {
        (Some(a), Some(b)) => a == b,
        _ => true,
    }
}

fn parse_host_ip(ip: Option<&str>) -> Option<IpAddr> {
    ip.and_then(|ip| ip.parse::<IpAddr>().ok())
        .filter(|ip| !ip.is_unspecified())
}

fn mount_problems(mounts: &[StorageMount]) -> Vec<String> {
    let mut problems = vec![];
    for (index, mount) in mounts.iter().enumerate() {
        let number = index + 1;
        match mount.kind {
            StorageMountKind::Volume if !is_docker_object_name(&mount.source) => {
                problems.push(format!(
                    "Mount {number}: volume name \"{}\" is invalid: use at least two characters from letters, digits, '_', '.' and '-', starting with a letter or digit",
                    mount.source
                ));
            }
            StorageMountKind::Bind if !is_absolute_host_path(&mount.source) => {
                problems.push(format!(
                    "Mount {number}: the host path \"{}\" must be an absolute path",
                    mount.source
                ));
            }
            _ => {}
        }

        if mount.target == "/" {
            problems.push(format!("Mount {number}: the container path cannot be /"));
        } else if !is_container_path(&mount.target) {
            problems.push(format!(
                "Mount {number}: the container path \"{}\" must be an absolute path such as /data",
                mount.target
            ));
        } else if let Some(earlier) = mounts[..index]
            .iter()
            .position(|other| same_container_path(&other.target, &mount.target))
        {
            problems.push(format!(
                "Mount {number}: the container path {} is already used by mount {}",
                mount.target,
                earlier + 1
            ));
        }
    }
    problems
}

fn same_container_path(a: &str, b: &str) -> bool {
    a.trim_end_matches('/') == b.trim_end_matches('/')
}

fn env_problems(env: &[KeyValue]) -> Vec<String> {
    let mut problems = vec![];
    let mut seen = HashSet::new();
    for (index, variable) in env.iter().enumerate() {
        if !is_env_key(&variable.key) {
            problems.push(format!(
                "Environment variable {}: \"{}\" is not a valid name: start with a letter or '_' and use only letters, digits, '_', '.' and '-'",
                index + 1,
                variable.key
            ));
        } else if !seen.insert(variable.key.as_str()) {
            problems.push(format!(
                "Environment variable {} is set more than once",
                variable.key
            ));
        }
    }
    problems
}

fn label_problems(labels: &[KeyValue]) -> Vec<String> {
    let mut problems = vec![];
    let mut seen = HashSet::new();
    for (index, label) in labels.iter().enumerate() {
        let malformed = label.key.is_empty()
            || label.key.contains('=')
            || label.key.chars().any(char::is_whitespace);
        if malformed {
            problems.push(format!(
                "Label {}: the key cannot be empty or contain '=' or whitespace",
                index + 1
            ));
        } else if !seen.insert(label.key.as_str()) {
            problems.push(format!("Label {} is set more than once", label.key));
        }
    }
    problems
}

fn network_problems(network: Option<&str>) -> Vec<String> {
    match network {
        Some(name) if name.is_empty() || name.chars().any(char::is_whitespace) => {
            vec![format!("Network name \"{name}\" is invalid")]
        }
        _ => vec![],
    }
}

fn resource_problems(cpus: Option<f64>, memory_mb: Option<u64>) -> Vec<String> {
    let mut problems = vec![];
    if cpus.is_some_and(|cpus| !(MIN_CPUS..=MAX_CPUS).contains(&cpus)) {
        problems.push(format!(
            "The CPU limit must be between {MIN_CPUS} and {MAX_CPUS} CPUs"
        ));
    }
    if memory_mb.is_some_and(|memory| !(MIN_MEMORY_MB..=MAX_MEMORY_MB).contains(&memory)) {
        problems.push(format!(
            "The memory limit must be between {MIN_MEMORY_MB} MiB and {MAX_MEMORY_MB} MiB (1 TiB)"
        ));
    }
    problems
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::PortProtocol;

    fn spec() -> CreateContainerSpec {
        CreateContainerSpec {
            image: "nginx:latest".to_string(),
            ..Default::default()
        }
    }

    fn port(container_port: u16, host_port: Option<u16>) -> PortMapping {
        PortMapping {
            container_port,
            host_port,
            ..Default::default()
        }
    }

    fn mount(kind: StorageMountKind, source: &str, target: &str) -> StorageMount {
        StorageMount {
            kind,
            source: source.to_string(),
            target: target.to_string(),
            read_only: false,
        }
    }

    fn pair(key: &str, value: &str) -> KeyValue {
        KeyValue {
            key: key.to_string(),
            value: value.to_string(),
        }
    }

    #[test]
    fn an_image_alone_is_a_complete_spec() {
        assert_eq!(problems(&spec()), Vec::<String>::new());
        assert_eq!(validate(&spec()), Ok(()));
    }

    #[test]
    fn the_image_is_required_and_cannot_contain_whitespace() {
        let blank = CreateContainerSpec {
            image: "  ".to_string(),
            ..spec()
        };
        let spaced = CreateContainerSpec {
            image: "nginx latest".to_string(),
            ..spec()
        };

        assert_eq!(
            problems(&blank),
            vec!["Choose an image to create the container from"]
        );
        assert_eq!(
            problems(&spaced),
            vec!["The image reference \"nginx latest\" cannot contain whitespace"]
        );
    }

    #[test]
    fn container_names_follow_the_docker_name_rules() {
        for valid in ["web", "my-app_1.0", "9lives", "ab"] {
            let named = CreateContainerSpec {
                name: Some(valid.to_string()),
                ..spec()
            };
            assert!(problems(&named).is_empty(), "{valid} should be valid");
        }
        for invalid in ["a", "", "-web", "_web", "my app", "web/1", "café"] {
            let named = CreateContainerSpec {
                name: Some(invalid.to_string()),
                ..spec()
            };
            assert_eq!(
                problems(&named),
                vec![format!(
                    "Container name \"{invalid}\" is invalid: use at least two characters from letters, digits, '_', '.' and '-', starting with a letter or digit"
                )],
                "{invalid} should be invalid"
            );
        }
    }

    #[test]
    fn overrides_must_not_be_empty_and_the_working_directory_must_be_absolute() {
        let overridden = CreateContainerSpec {
            command: Some(vec![]),
            entrypoint: Some(" ".to_string()),
            working_dir: Some("app".to_string()),
            ..spec()
        };

        assert_eq!(
            problems(&overridden),
            vec![
                "The command override is empty; leave it unset to use the image default",
                "The entrypoint override is empty; leave it unset to use the image default",
                "Working directory \"app\" must be an absolute path such as /app",
            ]
        );
    }

    #[test]
    fn auto_remove_only_goes_with_the_no_restart_policy() {
        let auto_removed = |restart_policy| CreateContainerSpec {
            auto_remove: true,
            restart_policy,
            ..spec()
        };

        assert!(problems(&auto_removed(RestartPolicy::No)).is_empty());
        assert_eq!(
            problems(&auto_removed(RestartPolicy::UnlessStopped)),
            vec!["Auto-remove cannot be combined with the unless-stopped restart policy"]
        );
        assert_eq!(
            problems(&auto_removed(RestartPolicy::OnFailure {
                maximum_retry_count: Some(3)
            })),
            vec!["Auto-remove cannot be combined with the on-failure restart policy"]
        );
    }

    #[test]
    fn ports_must_be_in_range_and_host_ips_must_parse() {
        let ports = CreateContainerSpec {
            ports: vec![
                port(0, Some(0)),
                PortMapping {
                    host_ip: Some("localhost".to_string()),
                    ..port(80, Some(8080))
                },
                PortMapping {
                    host_ip: Some("::1".to_string()),
                    ..port(443, Some(8443))
                },
            ],
            ..spec()
        };

        assert_eq!(
            problems(&ports),
            vec![
                "Port mapping 1: the container port must be between 1 and 65535",
                "Port mapping 1: the host port must be between 1 and 65535, or left empty for a random port",
                "Port mapping 2: \"localhost\" is not a valid host IP address",
            ]
        );
    }

    #[test]
    fn a_host_port_can_be_published_only_once_per_protocol_and_interface() {
        let ports = CreateContainerSpec {
            ports: vec![
                port(80, Some(8080)),
                port(81, Some(8080)),
                PortMapping {
                    protocol: PortProtocol::Udp,
                    ..port(82, Some(8080))
                },
                PortMapping {
                    host_ip: Some("127.0.0.1".to_string()),
                    ..port(83, Some(9090))
                },
                PortMapping {
                    host_ip: Some("192.168.1.10".to_string()),
                    ..port(84, Some(9090))
                },
                PortMapping {
                    host_ip: Some("0.0.0.0".to_string()),
                    ..port(85, Some(9090))
                },
                port(86, None),
                port(87, None),
            ],
            ..spec()
        };

        assert_eq!(
            problems(&ports),
            vec![
                "Port mapping 2: host port 8080/tcp is already used by port mapping 1",
                "Port mapping 6: host port 9090/tcp is already used by port mapping 4",
            ]
        );
    }

    #[test]
    fn ports_cannot_be_published_on_the_host_or_none_network() {
        for network in ["host", "none"] {
            let published = CreateContainerSpec {
                network: Some(network.to_string()),
                ports: vec![port(80, Some(8080))],
                ..spec()
            };
            assert_eq!(
                problems(&published),
                vec![format!(
                    "Port mappings cannot be used with the {network} network"
                )]
            );
        }
    }

    #[test]
    fn bind_mounts_take_host_paths_of_unix_and_windows_engines_from_any_client() {
        let bind_from = |source: &str| CreateContainerSpec {
            mounts: vec![mount(StorageMountKind::Bind, source, "/site")],
            ..spec()
        };

        for engine_path in [
            "/var/run/docker.sock",
            r"C:\Users\me\site",
            "D:/data",
            r"\\server\share\site",
        ] {
            assert_eq!(
                problems(&bind_from(engine_path)),
                Vec::<String>::new(),
                "{engine_path}"
            );
        }
        for relative_path in ["site", "~/site", "C:site"] {
            assert_eq!(
                problems(&bind_from(relative_path)),
                vec![format!(
                    "Mount 1: the host path \"{relative_path}\" must be an absolute path"
                )]
            );
        }
    }

    #[test]
    fn mounts_need_valid_sources_and_distinct_absolute_container_paths() {
        let mounts = CreateContainerSpec {
            mounts: vec![
                mount(StorageMountKind::Volume, "data", "/data"),
                mount(StorageMountKind::Volume, "x", "data"),
                mount(StorageMountKind::Bind, "~/site", "/"),
                mount(StorageMountKind::Bind, "/srv/site", "/data/"),
                mount(StorageMountKind::Bind, "/srv/logs", "/logs"),
            ],
            ..spec()
        };

        assert_eq!(
            problems(&mounts),
            vec![
                "Mount 2: volume name \"x\" is invalid: use at least two characters from letters, digits, '_', '.' and '-', starting with a letter or digit",
                "Mount 2: the container path \"data\" must be an absolute path such as /data",
                "Mount 3: the host path \"~/site\" must be an absolute path",
                "Mount 3: the container path cannot be /",
                "Mount 4: the container path /data/ is already used by mount 1",
            ]
        );
    }

    #[test]
    fn environment_variable_names_follow_the_shell_rules_and_appear_once() {
        let env = CreateContainerSpec {
            env: vec![
                pair("MODE", "dev"),
                pair("_private", ""),
                pair("spring.profiles.active", "local"),
                pair("1ST", "x"),
                pair("HAS SPACE", "x"),
                pair("", "x"),
                pair("MODE", "prod"),
            ],
            ..spec()
        };

        assert_eq!(
            problems(&env),
            vec![
                "Environment variable 4: \"1ST\" is not a valid name: start with a letter or '_' and use only letters, digits, '_', '.' and '-'",
                "Environment variable 5: \"HAS SPACE\" is not a valid name: start with a letter or '_' and use only letters, digits, '_', '.' and '-'",
                "Environment variable 6: \"\" is not a valid name: start with a letter or '_' and use only letters, digits, '_', '.' and '-'",
                "Environment variable MODE is set more than once",
            ]
        );
    }

    #[test]
    fn label_keys_are_non_empty_without_equals_or_whitespace_and_appear_once() {
        let labels = CreateContainerSpec {
            labels: vec![
                pair("com.example.team", "web"),
                pair("a=b", ""),
                pair("", "x"),
                pair("com.example.team", "api"),
            ],
            ..spec()
        };

        assert_eq!(
            problems(&labels),
            vec![
                "Label 2: the key cannot be empty or contain '=' or whitespace",
                "Label 3: the key cannot be empty or contain '=' or whitespace",
                "Label com.example.team is set more than once",
            ]
        );
    }

    #[test]
    fn the_network_name_cannot_be_blank() {
        let blank = CreateContainerSpec {
            network: Some(String::new()),
            ..spec()
        };

        assert_eq!(problems(&blank), vec!["Network name \"\" is invalid"]);
    }

    #[test]
    fn cpu_and_memory_limits_stay_within_what_docker_accepts() {
        let within = CreateContainerSpec {
            cpus: Some(0.01),
            memory_mb: Some(6),
            ..spec()
        };
        let outside = CreateContainerSpec {
            cpus: Some(0.001),
            memory_mb: Some(5),
            ..spec()
        };
        let not_a_number = CreateContainerSpec {
            cpus: Some(f64::NAN),
            ..spec()
        };

        assert!(problems(&within).is_empty());
        assert_eq!(
            problems(&outside),
            vec![
                "The CPU limit must be between 0.01 and 1024 CPUs",
                "The memory limit must be between 6 MiB and 1048576 MiB (1 TiB)",
            ]
        );
        assert_eq!(
            problems(&not_a_number),
            vec!["The CPU limit must be between 0.01 and 1024 CPUs"]
        );
    }

    #[test]
    fn validate_reports_every_problem_at_once() {
        let broken = CreateContainerSpec {
            image: String::new(),
            cpus: Some(0.0),
            ..spec()
        };

        assert_eq!(
            validate(&broken),
            Err("Choose an image to create the container from; The CPU limit must be between 0.01 and 1024 CPUs".to_string())
        );
    }
}
