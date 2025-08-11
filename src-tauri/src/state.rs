use bollard::Docker;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::instrument;

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
            let docker = Docker::connect_with_local_defaults()
                .map_err(|e| format!("Failed to connect to Docker: {}", e))?;
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
}
