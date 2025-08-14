use bollard::Docker;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::instrument;
use std::process::Command;
use std::path::Path;
use std::env;

#[derive(Default)]
pub struct SharedDockerState {
    docker: Arc<Mutex<Option<Docker>>>,
}

impl SharedDockerState {
    pub fn new() -> Self {
        Self {
            docker: Arc::new(Mutex::new(None)),
        }
    }

    #[instrument(skip_all, err)]
    pub async fn get_docker(&self) -> Result<Docker, String> {
        let mut docker_guard = self.docker.lock().await;

        if docker_guard.is_none() {
            let docker = Self::connect_to_docker().await?;
            *docker_guard = Some(docker);
        }

        match docker_guard.as_ref() {
            Some(docker) => Ok(docker.clone()),
            None => Err("Docker instance is not available".to_string()),
        }
    }

    #[instrument(skip_all)]
    pub async fn return_docker(&self, docker: Docker) {
        let mut docker_guard = self.docker.lock().await;
        *docker_guard = Some(docker);
    }

    #[instrument(skip_all, err)]
    async fn connect_to_docker() -> Result<Docker, String> {
        // On macOS, try to detect the correct Docker socket path
        #[cfg(target_os = "macos")]
        {
            // First, check if DOCKER_HOST environment variable is set
            if let Ok(docker_host) = env::var("DOCKER_HOST") {
                tracing::info!("DOCKER_HOST environment variable found: {}", docker_host);
                match Docker::connect_with_local_defaults() {
                    Ok(docker) => {
                        // Test the connection
                        match docker.info().await {
                            Ok(_) => {
                                tracing::info!("Successfully connected to Docker via DOCKER_HOST");
                                return Ok(docker);
                            }
                            Err(e) => {
                                tracing::warn!("DOCKER_HOST connection failed: {}, trying fallback", e);
                            }
                        }
                    }
                    Err(e) => {
                        tracing::warn!("DOCKER_HOST connection failed: {}, trying fallback", e);
                    }
                }
            }

            // Try to get the current Docker context and set DOCKER_HOST temporarily
            let context_output = Command::new("docker")
                .arg("context")
                .arg("inspect")
                .arg("--format")
                .arg("{{.Endpoints.docker.Host}}")
                .output();

            if let Ok(output) = context_output {
                if output.status.success() {
                    let socket_path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if socket_path.starts_with("unix://") {
                        let socket_path = socket_path.trim_start_matches("unix://");
                        tracing::info!("Current Docker context socket: {}", socket_path);

                        // Set DOCKER_HOST environment variable for this process
                        env::set_var("DOCKER_HOST", format!("unix://{}", socket_path));

                        // Try to connect using the context socket
                        match Docker::connect_with_local_defaults() {
                            Ok(docker) => {
                                // Test the connection
                                match docker.info().await {
                                    Ok(_) => {
                                        tracing::info!("Successfully connected to Docker via context socket");
                                        return Ok(docker);
                                    }
                                    Err(e) => {
                                        tracing::warn!("Context socket connection failed: {}, trying fallback", e);
                                    }
                                }
                            }
                            Err(e) => {
                                tracing::warn!("Context socket connection failed: {}, trying fallback", e);
                            }
                        }
                    }
                }
            }

            // Fallback: try common macOS Docker socket paths
            let common_paths = vec![
                "/Users/almaz/.colima/default/docker.sock",  // Colima default
                "/var/run/docker.sock",                     // Standard location
                "/Users/almaz/.docker/run/docker.sock",     // Docker Desktop
            ];

            for socket_path in common_paths {
                if Path::new(socket_path).exists() {
                    tracing::info!("Found Docker socket at: {}", socket_path);

                    // Set DOCKER_HOST to this socket path
                    env::set_var("DOCKER_HOST", format!("unix://{}", socket_path));

                    // Try to connect using the specific socket path
                    match Docker::connect_with_local_defaults() {
                        Ok(docker) => {
                            // Test the connection
                            match docker.info().await {
                                Ok(_) => {
                                    tracing::info!("Successfully connected to Docker at: {}", socket_path);
                                    return Ok(docker);
                                }
                                Err(e) => {
                                    tracing::warn!("Socket exists but connection failed: {}", e);
                                    continue;
                                }
                            }
                        }
                        Err(e) => {
                            tracing::warn!("Failed to connect to socket {}: {}", socket_path, e);
                            continue;
                        }
                    }
                }
            }

            // Last resort: try the default connection method
            tracing::info!("Trying default Docker connection method");
            Docker::connect_with_local_defaults()
                .map_err(|e| format!("Failed to connect to Docker: {}", e))
        }

        #[cfg(not(target_os = "macos"))]
        {
            // On non-macOS systems, use the default connection method
            Docker::connect_with_local_defaults()
                .map_err(|e| format!("Failed to connect to Docker: {}", e))
        }
    }
}
