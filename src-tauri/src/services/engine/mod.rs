use crate::entities::{Engine, EngineInfo, EngineStatus};
use crate::services::shell::{get_docker_context_endpoints, is_docker_command_available};

use bollard::Docker;
use std::time::Duration;
use tauri::AppHandle;
use tracing::{debug, instrument};

mod connected_engine;
#[cfg(target_os = "macos")]
mod macos;

pub use connected_engine::describe_connected_engine;

#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(not(target_os = "macos"))]
mod unmanaged_colima;

#[cfg(not(target_os = "macos"))]
pub use unmanaged_colima::*;

pub const COLIMA_MANAGED: bool = cfg!(target_os = "macos");

const DOCKER_HOST_ENV_VAR: &str = "DOCKER_HOST";
const ANSWER_TIMEOUT: Duration = Duration::from_secs(5);

#[cfg(unix)]
const DEFAULT_DOCKER_HOST: &str = "unix:///var/run/docker.sock";

#[cfg(windows)]
const DEFAULT_DOCKER_HOST: &str = "npipe:////./pipe/docker_engine";

#[cfg(any(not(target_os = "macos"), test))]
pub fn colima_unmanaged<T>() -> Result<T, String> {
    Err(format!(
        "Colima is only supported on macOS. On {} Nookat connects to a Docker daemon that is already running.",
        std::env::consts::OS
    ))
}

#[cfg(any(target_os = "macos", test))]
pub fn should_stop_vm(status: &Result<bool, String>) -> bool {
    let vm_known_to_be_stopped = matches!(status, Ok(false));
    !vm_known_to_be_stopped
}

#[instrument(skip_all, err)]
async fn connect_to_docker(app: &AppHandle) -> Result<(Docker, String), String> {
    let context_endpoints = get_docker_context_endpoints(app).await.unwrap_or_else(|e| {
        debug!("The Docker contexts are not readable: {}", e);
        Vec::new()
    });
    let docker_host = std::env::var(DOCKER_HOST_ENV_VAR).ok();

    for endpoint in endpoints_in_docker_cli_order(docker_host, context_endpoints) {
        match connect_to(&endpoint).await {
            Ok(docker) => {
                debug!("Connected to Docker at {}", endpoint);
                return Ok((docker, endpoint));
            }
            Err(e) => debug!("Docker at {} is not reachable: {}", endpoint, e),
        }
    }

    Err(
        "Failed to connect to Docker through DOCKER_HOST, the Docker contexts or the default socket"
            .to_string(),
    )
}

async fn connect_to(endpoint: &str) -> Result<Docker, String> {
    let docker = Docker::connect_with_host(endpoint).map_err(|e| e.to_string())?;

    tokio::time::timeout(ANSWER_TIMEOUT, docker.ping())
        .await
        .map_err(|_| format!("no answer within {} seconds", ANSWER_TIMEOUT.as_secs()))?
        .map_err(|e| e.to_string())?;

    Ok(docker)
}

fn endpoints_in_docker_cli_order(
    docker_host: Option<String>,
    context_endpoints: Vec<String>,
) -> Vec<String> {
    let mut endpoints = Vec::new();
    let candidates = docker_host
        .into_iter()
        .chain(context_endpoints)
        .chain([DEFAULT_DOCKER_HOST.to_string()]);

    for endpoint in candidates {
        if !endpoint.is_empty() && !endpoints.contains(&endpoint) {
            endpoints.push(endpoint);
        }
    }

    endpoints
}

#[instrument(skip_all, err)]
pub async fn create_engine(app: &AppHandle) -> Result<Engine, String> {
    debug!("Creating an engine instance");

    let docker_available = match is_docker_command_available(app).await {
        Ok(v) => v,
        Err(e) => {
            debug!("Docker availability check failed: {}", e);
            false
        }
    };
    if !docker_available {
        debug!("Docker command is not available, creating an engine instance with unknown status");
        return Ok(Engine {
            engine_status: EngineStatus::Unknown,
            docker: None,
            endpoint: None,
        });
    }

    if let Ok((docker, endpoint)) = connect_to_docker(app).await {
        debug!("Docker command is available, creating an engine instance with running status");
        return Ok(Engine {
            engine_status: EngineStatus::Running(EngineInfo::Docker),
            docker: Some(docker),
            endpoint: Some(endpoint),
        });
    }

    Ok(Engine {
        engine_status: EngineStatus::Unknown,
        docker: None,
        endpoint: None,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        colima_unmanaged, endpoints_in_docker_cli_order, should_stop_vm, COLIMA_MANAGED,
        DEFAULT_DOCKER_HOST,
    };

    fn endpoints(list: &[&str]) -> Vec<String> {
        list.iter().map(|endpoint| endpoint.to_string()).collect()
    }

    #[test]
    fn tries_docker_host_then_the_contexts_then_the_default_socket() {
        let order = endpoints_in_docker_cli_order(
            Some("tcp://127.0.0.1:23750".to_string()),
            endpoints(&[
                "unix:///Users/me/.colima/default/docker.sock",
                "unix:///Users/me/.orbstack/run/docker.sock",
            ]),
        );

        assert_eq!(
            order,
            endpoints(&[
                "tcp://127.0.0.1:23750",
                "unix:///Users/me/.colima/default/docker.sock",
                "unix:///Users/me/.orbstack/run/docker.sock",
                DEFAULT_DOCKER_HOST,
            ])
        );
    }

    #[test]
    fn tries_each_endpoint_once_and_skips_empty_ones() {
        let order = endpoints_in_docker_cli_order(
            None,
            endpoints(&[
                "",
                DEFAULT_DOCKER_HOST,
                "unix:///Users/me/.orbstack/run/docker.sock",
            ]),
        );

        assert_eq!(
            order,
            endpoints(&[
                DEFAULT_DOCKER_HOST,
                "unix:///Users/me/.orbstack/run/docker.sock"
            ])
        );
    }

    #[test]
    fn stops_when_the_vm_is_running() {
        assert!(should_stop_vm(&Ok(true)));
    }

    #[test]
    fn skips_the_stop_when_the_vm_is_not_running() {
        assert!(!should_stop_vm(&Ok(false)));
    }

    #[test]
    fn attempts_the_stop_when_the_status_check_fails() {
        assert!(should_stop_vm(&Err("colima not found".to_string())));
    }

    #[test]
    fn colima_is_managed_on_macos_only() {
        assert_eq!(COLIMA_MANAGED, cfg!(target_os = "macos"));
    }

    #[test]
    fn the_unmanaged_answer_is_an_error_and_names_both_platforms() {
        let message = colima_unmanaged::<()>().expect_err("must not be Ok");
        assert!(message.contains("macOS"), "{message}");
        assert!(message.contains(std::env::consts::OS), "{message}");
    }

    #[test]
    fn tauri_commands_report_unsupported_operations_as_errors_never_as_panics() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
        let panicking_placeholders = ["todo", "unimplemented"].map(|name| format!("{name}!("));
        let mut offenders = Vec::new();

        let mut stack = vec![root.join("services"), root.join("handlers")];
        while let Some(path) = stack.pop() {
            let entries = std::fs::read_dir(&path).expect("readable source directory");
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    stack.push(path);
                    continue;
                }
                if path.extension().is_none_or(|ext| ext != "rs") {
                    continue;
                }
                let source = std::fs::read_to_string(&path).expect("readable source file");
                for (index, line) in source.lines().enumerate() {
                    if panicking_placeholders.iter().any(|p| line.contains(p)) {
                        offenders.push(format!("{}:{}", path.display(), index + 1));
                    }
                }
            }
        }

        assert!(
            offenders.is_empty(),
            "panicking placeholder reachable from a Tauri command: {}",
            offenders.join(", ")
        );
    }
}
