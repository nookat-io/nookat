use crate::entities::{
    CreateContainerSpec, KeyValue, PortMapping, RestartPolicy, StorageMount, StorageMountKind,
};
use bollard::models::{
    ContainerCreateBody, EndpointSettings, HostConfig, Mount, MountType, NetworkingConfig,
    PortBinding, PortMap, RestartPolicy as DockerRestartPolicy, RestartPolicyNameEnum,
};
use bollard::query_parameters::CreateContainerOptions;
use std::collections::HashMap;

const NANO_CPUS_PER_CPU: f64 = 1_000_000_000.0;
const BYTES_PER_MB: i64 = 1024 * 1024;

pub fn create_request(spec: &CreateContainerSpec) -> (CreateContainerOptions, ContainerCreateBody) {
    let options = CreateContainerOptions {
        name: spec.name.clone(),
        ..Default::default()
    };

    let body = ContainerCreateBody {
        image: Some(spec.image.clone()),
        cmd: spec.command.clone(),
        entrypoint: spec.entrypoint.clone().map(|entrypoint| vec![entrypoint]),
        working_dir: spec.working_dir.clone(),
        env: non_empty(spec.env.iter().map(env_entry).collect()),
        labels: non_empty_map(spec.labels.iter().map(label_entry).collect()),
        exposed_ports: non_empty(exposed_ports(&spec.ports)),
        host_config: Some(host_config(spec)),
        networking_config: spec.network.as_deref().map(networking_config),
        ..Default::default()
    };

    (options, body)
}

fn host_config(spec: &CreateContainerSpec) -> HostConfig {
    HostConfig {
        restart_policy: Some(restart_policy(spec.restart_policy)),
        auto_remove: Some(spec.auto_remove),
        port_bindings: non_empty_map(port_bindings(&spec.ports)),
        mounts: non_empty(spec.mounts.iter().map(mount).collect()),
        network_mode: spec.network.clone(),
        nano_cpus: spec.cpus.map(nano_cpus),
        memory: spec.memory_mb.map(|mb| mb as i64 * BYTES_PER_MB),
        ..Default::default()
    }
}

fn restart_policy(policy: RestartPolicy) -> DockerRestartPolicy {
    let (name, maximum_retry_count) = match policy {
        RestartPolicy::No => (RestartPolicyNameEnum::NO, None),
        RestartPolicy::Always => (RestartPolicyNameEnum::ALWAYS, None),
        RestartPolicy::UnlessStopped => (RestartPolicyNameEnum::UNLESS_STOPPED, None),
        RestartPolicy::OnFailure {
            maximum_retry_count,
        } => (
            RestartPolicyNameEnum::ON_FAILURE,
            maximum_retry_count.map(i64::from),
        ),
    };
    DockerRestartPolicy {
        name: Some(name),
        maximum_retry_count,
    }
}

fn port_key(port: &PortMapping) -> String {
    format!("{}/{}", port.container_port, port.protocol)
}

fn exposed_ports(ports: &[PortMapping]) -> Vec<String> {
    let mut keys: Vec<String> = vec![];
    for key in ports.iter().map(port_key) {
        if !keys.contains(&key) {
            keys.push(key);
        }
    }
    keys
}

fn port_bindings(ports: &[PortMapping]) -> PortMap {
    let mut bindings: HashMap<String, Vec<PortBinding>> = HashMap::new();
    for port in ports {
        bindings
            .entry(port_key(port))
            .or_default()
            .push(PortBinding {
                host_ip: port.host_ip.clone(),
                host_port: port.host_port.map(|host_port| host_port.to_string()),
            });
    }
    bindings
        .into_iter()
        .map(|(key, bindings)| (key, Some(bindings)))
        .collect()
}

fn mount(mount: &StorageMount) -> Mount {
    Mount {
        typ: Some(match mount.kind {
            StorageMountKind::Volume => MountType::VOLUME,
            StorageMountKind::Bind => MountType::BIND,
        }),
        source: Some(mount.source.clone()),
        target: Some(mount.target.clone()),
        read_only: Some(mount.read_only),
        ..Default::default()
    }
}

fn networking_config(network: &str) -> NetworkingConfig {
    NetworkingConfig {
        endpoints_config: Some(HashMap::from([(
            network.to_string(),
            EndpointSettings::default(),
        )])),
    }
}

fn nano_cpus(cpus: f64) -> i64 {
    (cpus * NANO_CPUS_PER_CPU).round() as i64
}

fn env_entry(variable: &KeyValue) -> String {
    format!("{}={}", variable.key, variable.value)
}

fn label_entry(label: &KeyValue) -> (String, String) {
    (label.key.clone(), label.value.clone())
}

fn non_empty<T>(items: Vec<T>) -> Option<Vec<T>> {
    Some(items).filter(|items| !items.is_empty())
}

fn non_empty_map<K, V>(map: HashMap<K, V>) -> Option<HashMap<K, V>> {
    Some(map).filter(|map| !map.is_empty())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::PortProtocol;

    fn spec() -> CreateContainerSpec {
        CreateContainerSpec {
            image: "nginx:1.27".to_string(),
            ..Default::default()
        }
    }

    fn pair(key: &str, value: &str) -> KeyValue {
        KeyValue {
            key: key.to_string(),
            value: value.to_string(),
        }
    }

    #[test]
    fn a_bare_spec_runs_the_image_defaults_without_restarting() {
        let (options, body) = create_request(&spec());
        let host_config = body.host_config.expect("host config");

        assert_eq!(options.name, None);
        assert_eq!(body.image.as_deref(), Some("nginx:1.27"));
        assert_eq!(body.cmd, None);
        assert_eq!(body.entrypoint, None);
        assert_eq!(body.env, None);
        assert_eq!(body.labels, None);
        assert_eq!(body.exposed_ports, None);
        assert_eq!(body.networking_config, None);
        assert_eq!(
            host_config.restart_policy,
            Some(DockerRestartPolicy {
                name: Some(RestartPolicyNameEnum::NO),
                maximum_retry_count: None,
            })
        );
        assert_eq!(host_config.auto_remove, Some(false));
        assert_eq!(host_config.port_bindings, None);
        assert_eq!(host_config.mounts, None);
        assert_eq!(host_config.network_mode, None);
        assert_eq!(host_config.nano_cpus, None);
        assert_eq!(host_config.memory, None);
    }

    #[test]
    fn the_general_settings_map_to_the_process_and_name() {
        let (options, body) = create_request(&CreateContainerSpec {
            name: Some("web".to_string()),
            command: Some(vec!["-c".to_string(), "echo hi && sleep 1".to_string()]),
            entrypoint: Some("/bin/sh".to_string()),
            working_dir: Some("/srv".to_string()),
            restart_policy: RestartPolicy::OnFailure {
                maximum_retry_count: Some(5),
            },
            ..spec()
        });

        assert_eq!(options.name.as_deref(), Some("web"));
        assert_eq!(
            body.cmd,
            Some(vec!["-c".to_string(), "echo hi && sleep 1".to_string()])
        );
        assert_eq!(body.entrypoint, Some(vec!["/bin/sh".to_string()]));
        assert_eq!(body.working_dir.as_deref(), Some("/srv"));
        assert_eq!(
            body.host_config.expect("host config").restart_policy,
            Some(DockerRestartPolicy {
                name: Some(RestartPolicyNameEnum::ON_FAILURE),
                maximum_retry_count: Some(5),
            })
        );
    }

    #[test]
    fn ports_are_exposed_and_bound_with_random_host_ports_left_empty() {
        let (_, body) = create_request(&CreateContainerSpec {
            ports: vec![
                PortMapping {
                    container_port: 80,
                    host_port: Some(8080),
                    ..Default::default()
                },
                PortMapping {
                    container_port: 80,
                    host_port: Some(8081),
                    host_ip: Some("127.0.0.1".to_string()),
                    ..Default::default()
                },
                PortMapping {
                    container_port: 53,
                    protocol: PortProtocol::Udp,
                    host_port: None,
                    host_ip: None,
                },
            ],
            ..spec()
        });

        assert_eq!(
            body.exposed_ports,
            Some(vec!["80/tcp".to_string(), "53/udp".to_string()])
        );
        assert_eq!(
            body.host_config.expect("host config").port_bindings,
            Some(HashMap::from([
                (
                    "80/tcp".to_string(),
                    Some(vec![
                        PortBinding {
                            host_ip: None,
                            host_port: Some("8080".to_string()),
                        },
                        PortBinding {
                            host_ip: Some("127.0.0.1".to_string()),
                            host_port: Some("8081".to_string()),
                        },
                    ])
                ),
                (
                    "53/udp".to_string(),
                    Some(vec![PortBinding {
                        host_ip: None,
                        host_port: None,
                    }])
                ),
            ]))
        );
    }

    #[test]
    fn the_same_container_port_is_exposed_once_even_when_bound_twice_apart() {
        let port = |container_port, host_port| PortMapping {
            container_port,
            host_port: Some(host_port),
            ..Default::default()
        };
        let (_, body) = create_request(&CreateContainerSpec {
            ports: vec![port(80, 8080), port(443, 8443), port(80, 9090)],
            ..spec()
        });

        assert_eq!(
            body.exposed_ports,
            Some(vec!["80/tcp".to_string(), "443/tcp".to_string()])
        );
    }

    #[test]
    fn volumes_and_bind_mounts_become_typed_mounts() {
        let (_, body) = create_request(&CreateContainerSpec {
            mounts: vec![
                StorageMount {
                    kind: StorageMountKind::Volume,
                    source: "pgdata".to_string(),
                    target: "/var/lib/postgresql/data".to_string(),
                    read_only: false,
                },
                StorageMount {
                    kind: StorageMountKind::Bind,
                    source: "/Users/me/site".to_string(),
                    target: "/usr/share/nginx/html".to_string(),
                    read_only: true,
                },
            ],
            ..spec()
        });

        assert_eq!(
            body.host_config.expect("host config").mounts,
            Some(vec![
                Mount {
                    typ: Some(MountType::VOLUME),
                    source: Some("pgdata".to_string()),
                    target: Some("/var/lib/postgresql/data".to_string()),
                    read_only: Some(false),
                    ..Default::default()
                },
                Mount {
                    typ: Some(MountType::BIND),
                    source: Some("/Users/me/site".to_string()),
                    target: Some("/usr/share/nginx/html".to_string()),
                    read_only: Some(true),
                    ..Default::default()
                },
            ])
        );
    }

    #[test]
    fn environment_keeps_its_order_and_labels_become_a_map() {
        let (_, body) = create_request(&CreateContainerSpec {
            env: vec![pair("B", "2"), pair("A", "with = sign"), pair("EMPTY", "")],
            labels: vec![pair("com.example.team", "web")],
            ..spec()
        });

        assert_eq!(
            body.env,
            Some(vec![
                "B=2".to_string(),
                "A=with = sign".to_string(),
                "EMPTY=".to_string()
            ])
        );
        assert_eq!(
            body.labels,
            Some(HashMap::from([(
                "com.example.team".to_string(),
                "web".to_string()
            )]))
        );
    }

    #[test]
    fn a_network_is_both_the_network_mode_and_the_only_endpoint() {
        let (_, body) = create_request(&CreateContainerSpec {
            network: Some("backend".to_string()),
            ..spec()
        });

        assert_eq!(
            body.host_config
                .expect("host config")
                .network_mode
                .as_deref(),
            Some("backend")
        );
        assert_eq!(
            body.networking_config,
            Some(NetworkingConfig {
                endpoints_config: Some(HashMap::from([(
                    "backend".to_string(),
                    EndpointSettings::default()
                )])),
            })
        );
    }

    #[test]
    fn resource_limits_use_docker_units() {
        let (_, body) = create_request(&CreateContainerSpec {
            cpus: Some(1.5),
            memory_mb: Some(512),
            auto_remove: true,
            ..spec()
        });
        let host_config = body.host_config.expect("host config");

        assert_eq!(host_config.nano_cpus, Some(1_500_000_000));
        assert_eq!(host_config.memory, Some(536_870_912));
        assert_eq!(host_config.auto_remove, Some(true));
    }

    #[test]
    fn a_fractional_cpu_limit_rounds_to_the_nearest_nano_cpu() {
        assert_eq!(nano_cpus(0.1), 100_000_000);
        assert_eq!(nano_cpus(0.01), 10_000_000);
    }
}
