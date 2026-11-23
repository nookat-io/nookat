mod create_request;

use super::docker_error::docker_message;
use super::run_for_each_concurrently;
use crate::entities::{BulkOutcome, Network, NetworkCreateOptions};
use bollard::models::Network as BollardNetwork;
use bollard::query_parameters::ListNetworksOptions;
use bollard::Docker;
use create_request::{network_create_request, MAX_NETWORK_NAME_LENGTH};
use std::collections::{HashMap, HashSet};
use tracing::instrument;

const SYSTEM_NETWORKS: [&str; 3] = ["bridge", "host", "none"];

#[derive(Default, Debug)]
pub struct NetworksService {}

impl NetworksService {
    #[instrument(skip_all, err)]
    pub async fn get_networks(docker: &Docker) -> Result<Vec<Network>, String> {
        let not_dangling = ListNetworksOptions {
            filters: Some(HashMap::from([(
                "dangling".to_string(),
                vec!["false".to_string()],
            )])),
        };

        let (all_networks, networks_in_use): (Vec<BollardNetwork>, Vec<BollardNetwork>) =
            tokio::try_join!(
                docker.list_networks(Some(ListNetworksOptions::default())),
                docker.list_networks(Some(not_dangling)),
            )
            .map_err(|e| format!("Failed to list networks: {}", docker_message(&e)))?;

        let ids_in_use: HashSet<String> = networks_in_use
            .into_iter()
            .filter_map(|network| network.id)
            .collect();

        Ok(all_networks
            .into_iter()
            .map(|network| {
                let in_use = network
                    .id
                    .as_ref()
                    .is_some_and(|id| ids_in_use.contains(id));
                Network::from_summary(network, in_use)
            })
            .collect())
    }

    #[instrument(skip_all, err)]
    pub async fn create_network(
        docker: &Docker,
        options: &NetworkCreateOptions,
    ) -> Result<(), String> {
        let request = network_create_request(options)?;
        ensure_name_is_free(docker, &request.name).await?;

        docker.create_network(request).await.map_err(|e| {
            format!(
                "Failed to create network {}: {}",
                options.name,
                docker_message(&e)
            )
        })?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn remove_network(docker: &Docker, name: &str) -> Result<(), String> {
        ensure_removable(name)?;

        docker
            .remove_network(name)
            .await
            .map_err(|e| format!("Failed to remove network {}: {}", name, docker_message(&e)))?;

        Ok(())
    }

    #[instrument(skip_all)]
    pub async fn bulk_remove_networks(docker: &Docker, names: &[String]) -> BulkOutcome {
        run_for_each_concurrently(names, |name| Self::remove_network(docker, name)).await
    }
}

#[instrument(skip_all, err)]
async fn ensure_name_is_free(docker: &Docker, name: &str) -> Result<(), String> {
    let networks_matching_the_name = ListNetworksOptions {
        filters: Some(HashMap::from([(
            "name".to_string(),
            vec![name.to_string()],
        )])),
    };

    let networks = docker
        .list_networks(Some(networks_matching_the_name))
        .await
        .map_err(|e| format!("Failed to list networks: {}", e))?;

    if networks
        .iter()
        .any(|network| network.name.as_deref() == Some(name))
    {
        return Err(format!("A network named \"{name}\" already exists"));
    }
    Ok(())
}

fn ensure_removable(name: &str) -> Result<(), String> {
    if name.trim().is_empty() {
        return Err("Network name cannot be empty".to_string());
    }

    if name.len() > MAX_NETWORK_NAME_LENGTH {
        return Err(format!(
            "Network name too long (max {} characters): {}",
            MAX_NETWORK_NAME_LENGTH, name
        ));
    }

    if SYSTEM_NETWORKS.contains(&name.to_lowercase().as_str()) {
        return Err(format!("Cannot remove system network: {}", name));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{ensure_removable, NetworksService};
    use crate::entities::{IpAddressing, NetworkCreateOptions, NetworkDriver, NetworkLabel};
    use bollard::models::IpamConfig;
    use bollard::Docker;
    use std::collections::HashMap;

    #[test]
    fn a_user_network_can_be_removed() {
        assert!(ensure_removable("my-app_default").is_ok());
    }

    #[test]
    fn system_networks_cannot_be_removed_in_any_letter_case() {
        for name in ["bridge", "HOST", "None"] {
            assert!(ensure_removable(name).is_err(), "{name}");
        }
    }

    #[test]
    fn blank_and_overlong_names_are_rejected() {
        assert!(ensure_removable("  ").is_err());
        assert!(ensure_removable(&"n".repeat(129)).is_err());
    }

    #[cfg(unix)]
    mod against_a_fake_daemon {
        use super::super::NetworksService;
        use crate::services::fake_docker_daemon::{http_response, request_lines, serve_daemon};
        use bollard::Docker;
        use std::path::Path;

        fn connect(socket: &Path) -> Docker {
            Docker::connect_with_unix(socket.to_str().unwrap(), 5, bollard::API_DEFAULT_VERSION)
                .unwrap()
        }

        fn first_line(request: &str) -> &str {
            request.lines().next().unwrap_or_default()
        }

        #[tokio::test]
        async fn a_network_is_in_use_when_the_daemon_lists_it_as_not_dangling() {
            let dir = tempfile::tempdir().unwrap();
            let socket = dir.path().join("docker.sock");
            let requests = serve_daemon(&socket, |request| {
                let line = first_line(request);
                if line.starts_with("GET /networks") && line.contains("dangling") {
                    http_response(
                        "200 OK",
                        "application/json",
                        r#"[{"Id":"b1","Name":"busy"}]"#,
                    )
                } else if line.starts_with("GET /networks") {
                    http_response(
                        "200 OK",
                        "application/json",
                        r#"[{"Id":"b1","Name":"busy"},{"Id":"i1","Name":"idle"}]"#,
                    )
                } else {
                    http_response("200 OK", "application/json", "[]")
                }
            });
            let docker = connect(&socket);

            let networks = NetworksService::get_networks(&docker).await.unwrap();

            let in_use: Vec<(&str, bool)> = networks
                .iter()
                .map(|network| (network.name.as_str(), network.in_use))
                .collect();
            assert_eq!(in_use, [("busy", true), ("idle", false)]);
            let lines = request_lines(&requests);
            assert!(
                !lines.iter().any(|line| line.contains("/containers/json")),
                "{lines:?}"
            );
        }

        #[tokio::test]
        async fn bulk_remove_tries_every_network_and_reports_the_ones_refused() {
            let dir = tempfile::tempdir().unwrap();
            let socket = dir.path().join("docker.sock");
            let requests = serve_daemon(&socket, |request| {
                if first_line(request).starts_with("DELETE /networks/busy ") {
                    http_response(
                        "403 Forbidden",
                        "application/json",
                        r#"{"message":"error while removing network: network busy has active endpoints (name:\"web\" id:\"0a1b2c3d4e5f\")"}"#,
                    )
                } else {
                    http_response("204 No Content", "text/plain", "")
                }
            });
            let docker = connect(&socket);
            let names = ["free", "busy", "bridge", "other"].map(String::from);

            let outcome = NetworksService::bulk_remove_networks(&docker, &names).await;

            assert_eq!(outcome.succeeded, ["free", "other"]);
            let failures: Vec<(&str, &str)> = outcome
                .failed
                .iter()
                .map(|failure| (failure.id.as_str(), failure.error.as_str()))
                .collect();
            assert_eq!(
                failures,
                [
                    (
                        "busy",
                        r#"Failed to remove network busy: error while removing network: network busy has active endpoints (name:"web" id:"0a1b2c3d4e5f")"#
                    ),
                    ("bridge", "Cannot remove system network: bridge"),
                ]
            );
            let lines = request_lines(&requests);
            assert!(
                lines
                    .iter()
                    .any(|line| line.starts_with("DELETE /networks/other")),
                "{lines:?}"
            );
            assert!(
                !lines
                    .iter()
                    .any(|line| line.starts_with("DELETE /networks/bridge")),
                "{lines:?}"
            );
        }
    }

    #[tokio::test]
    #[ignore = "creates and removes a nookat-e2e- network on the local Docker engine"]
    async fn creates_a_network_with_a_subnet_and_labels_on_the_local_engine() {
        let docker = Docker::connect_with_local_defaults().expect("a local Docker engine");
        let name = format!("nookat-e2e-create-network-{}", std::process::id());
        let options = NetworkCreateOptions {
            name: name.clone(),
            driver: NetworkDriver::Bridge,
            parent_interface: None,
            internal: true,
            attachable: false,
            ipv4: IpAddressing {
                enabled: true,
                subnet: Some("10.213.47.0/24".to_string()),
                gateway: Some("10.213.47.1".to_string()),
                ip_range: Some("10.213.47.128/25".to_string()),
            },
            ipv6: IpAddressing::default(),
            labels: vec![NetworkLabel {
                key: "io.nookat.e2e".to_string(),
                value: "create-network".to_string(),
            }],
        };

        let created = NetworksService::create_network(&docker, &options).await;
        let created_again = NetworksService::create_network(&docker, &options).await;
        let inspected = docker.inspect_network(&name, None).await;
        let removed = docker.remove_network(&name).await;

        created.expect("the network is created");
        removed.expect("the network is removed");
        let network = inspected.expect("the network is inspected");
        assert_eq!(
            created_again,
            Err(format!("A network named \"{name}\" already exists"))
        );
        assert_eq!(network.driver.as_deref(), Some("bridge"));
        assert_eq!(network.internal, Some(true));
        assert_eq!(
            network.labels,
            Some(HashMap::from([(
                "io.nookat.e2e".to_string(),
                "create-network".to_string()
            )]))
        );
        assert_eq!(
            network.ipam.and_then(|ipam| ipam.config),
            Some(vec![IpamConfig {
                subnet: Some("10.213.47.0/24".to_string()),
                gateway: Some("10.213.47.1".to_string()),
                ip_range: Some("10.213.47.128/25".to_string()),
                ..Default::default()
            }])
        );
    }
}
