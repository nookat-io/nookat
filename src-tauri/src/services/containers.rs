use bollard::models::{ContainerStateStatusEnum, ContainerSummary};
use bollard::{
    container::{
        ListContainersOptions, LogsOptions, RemoveContainerOptions, RestartContainerOptions,
        StartContainerOptions, StopContainerOptions,
    },
    Docker,
};
use tracing::instrument;

#[derive(Default, Debug)]
pub struct ContainersService {}

impl ContainersService {
    #[instrument(skip_all, err)]
    pub async fn get_containers(docker: &Docker) -> Result<Vec<ContainerSummary>, String> {
        let options: ListContainersOptions<String> = ListContainersOptions {
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
        let options = StartContainerOptions::<String> {
            ..Default::default()
        };

        docker
            .start_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to start container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn stop_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = StopContainerOptions { t: 0 };

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
        let options = RestartContainerOptions { t: 0 };

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
        let options = LogsOptions::<String> {
            stdout: true,
            stderr: true,
            ..Default::default()
        };

        // Use the logs method to get container logs
        let logs_stream = docker.logs(id, Some(options));

        // Convert the logs stream to strings
        let mut logs = Vec::new();

        // Collect all log entries from the stream
        use futures_util::StreamExt;

        let mut stream = logs_stream;
        while let Some(log_entry) = stream.next().await {
            match log_entry {
                Ok(bollard::container::LogOutput::StdOut { message })
                | Ok(bollard::container::LogOutput::StdErr { message }) => {
                    // Convert bytes to string
                    if let Ok(log_line) = String::from_utf8(message.to_vec()) {
                        logs.push(log_line);
                    }
                }
                Ok(_) => {
                    // Handle other log output types if needed
                    continue;
                }
                Err(e) => {
                    return Err(format!("Error reading log stream: {}", e));
                }
            }
        }

        // If no logs were collected, return a default message
        if logs.is_empty() {
            logs.push("No logs available for this container".to_string());
        }

        Ok(logs)
    }

    #[instrument(skip_all, err)]
    pub async fn prune_containers(docker: &Docker) -> Result<(), String> {
        // Use the prune containers method
        docker
            .prune_containers(None::<bollard::container::PruneContainersOptions<String>>)
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
