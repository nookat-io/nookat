use bollard::container::LogOutput;
use bollard::models::{ContainerStateStatusEnum, ContainerSummary};
use bollard::query_parameters::{
    ListContainersOptions, LogsOptions, PruneContainersOptions, RemoveContainerOptions,
    RestartContainerOptions, StartContainerOptions, StopContainerOptions,
};
use bollard::Docker;
use futures_util::StreamExt;
use tracing::instrument;

const NO_LOGS_MESSAGE: &str = "No logs available for this container";

#[derive(Default, Debug)]
pub struct ContainersService {}

impl ContainersService {
    #[instrument(skip_all, err)]
    pub async fn get_containers(docker: &Docker) -> Result<Vec<ContainerSummary>, String> {
        let options = ListContainersOptions {
            all: true,
            size: true,
            ..Default::default()
        };

        let containers = docker
            .list_containers(Some(options))
            .await
            .map_err(|e| format!("Failed to list containers: {}", e))?;

        Ok(containers.to_vec())
    }

    #[instrument(skip_all, err)]
    pub async fn start_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = StartContainerOptions::default();

        docker
            .start_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to start container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn stop_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = StopContainerOptions {
            t: Some(0),
            ..Default::default()
        };

        docker
            .stop_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to stop container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn pause_container(docker: &Docker, id: &str) -> Result<(), String> {
        docker
            .pause_container(id)
            .await
            .map_err(|e| format!("Failed to pause container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn unpause_container(docker: &Docker, id: &str) -> Result<(), String> {
        docker
            .unpause_container(id)
            .await
            .map_err(|e| format!("Failed to unpause container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn restart_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = RestartContainerOptions {
            t: Some(0),
            ..Default::default()
        };

        docker
            .restart_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to restart container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn remove_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = RemoveContainerOptions {
            force: false,
            link: false,
            v: false,
        };

        docker
            .remove_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to remove container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn force_remove_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = RemoveContainerOptions {
            force: true,
            link: false,
            v: false,
        };

        docker
            .remove_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to force remove container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn get_container_logs(docker: &Docker, id: &str) -> Result<Vec<String>, String> {
        let options = LogsOptions {
            stdout: true,
            stderr: true,
            ..Default::default()
        };

        let mut log_stream = docker.logs(id, Some(options));
        let mut logs = Vec::new();

        while let Some(log_output) = log_stream.next().await {
            match log_output.map_err(|e| format!("Error reading log stream: {}", e))? {
                LogOutput::StdOut { message }
                | LogOutput::StdErr { message }
                | LogOutput::Console { message } => {
                    logs.push(String::from_utf8_lossy(&message).into_owned());
                }
                LogOutput::StdIn { .. } => {}
            }
        }

        if logs.is_empty() {
            logs.push(NO_LOGS_MESSAGE.to_string());
        }

        Ok(logs)
    }

    #[instrument(skip_all, err)]
    pub async fn prune_containers(docker: &Docker) -> Result<(), String> {
        docker
            .prune_containers(None::<PruneContainersOptions>)
            .await
            .map_err(|e| format!("Failed to prune containers: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn is_container_running(docker: &Docker, id: &str) -> Result<bool, String> {
        let container = docker
            .inspect_container(id, None)
            .await
            .map_err(|e| format!("Failed to inspect container: {}", e))?;

        let is_running = matches!(
            container.state.as_ref().and_then(|s| s.status),
            Some(ContainerStateStatusEnum::RUNNING)
        );

        Ok(is_running)
    }
}
