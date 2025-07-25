use bollard::models::ContainerSummary;
use bollard::{
    container::{ListContainersOptions, StartContainerOptions, StopContainerOptions, RestartContainerOptions, RemoveContainerOptions, LogsOptions},
    Docker,
};
use std::process::Command;
use crate::{AppError, AppResult};
use crate::services::DockerService;
use log::{info, warn, error, debug};
use futures_util::StreamExt;
use std::collections::HashMap;

#[derive(Default, Debug)]
pub struct ContainersService {}

// Configuration constants
const DEFAULT_STOP_TIMEOUT: i64 = 10; // 10 seconds for graceful shutdown
const DEFAULT_RESTART_TIMEOUT: i64 = 10; // 10 seconds for graceful restart

impl ContainersService {
    pub async fn get_containers() -> AppResult<Vec<ContainerSummary>> {
        let docker = DockerService::connect()?;

        let options: ListContainersOptions<String> = ListContainersOptions {
            all: true,
            size: true,
            ..Default::default()
        };

        info!("Fetching container list");
        let containers = docker
            .list_containers(Some(options))
            .await
            .map_err(|e| {
                error!("Failed to list containers: {}", e);
                AppError::DockerConnection(e)
            })?;

        debug!("Found {} containers", containers.len());
        Ok(containers)
    }

    pub async fn start_container(id: &str) -> AppResult<()> {
        DockerService::validate_container_id(id)?;
        let docker = DockerService::connect()?;

        info!("Starting container: {}", id);

        let options = StartContainerOptions::<String> {
            ..Default::default()
        };

        docker
            .start_container(id, Some(options))
            .await
            .map_err(|e| {
                error!("Failed to start container {}: {}", id, e);
                match e {
                    bollard::errors::Error::DockerResponseServerError { status_code: 404, .. } => {
                        AppError::ContainerNotFound { id: id.to_string() }
                    }
                    _ => AppError::DockerConnection(e)
                }
            })?;

        info!("Successfully started container: {}", id);
        Ok(())
    }

    pub async fn stop_container(id: &str) -> AppResult<()> {
        DockerService::validate_container_id(id)?;
        let docker = DockerService::connect()?;

        info!("Stopping container: {}", id);

        let options = StopContainerOptions {
            t: DEFAULT_STOP_TIMEOUT,
        };

        docker
            .stop_container(id, Some(options))
            .await
            .map_err(|e| {
                error!("Failed to stop container {}: {}", id, e);
                match e {
                    bollard::errors::Error::DockerResponseServerError { status_code: 404, .. } => {
                        AppError::ContainerNotFound { id: id.to_string() }
                    }
                    _ => AppError::DockerConnection(e)
                }
            })?;

        info!("Successfully stopped container: {}", id);
        Ok(())
    }

    pub async fn pause_container(id: &str) -> AppResult<()> {
        DockerService::validate_container_id(id)?;
        let docker = DockerService::connect()?;

        info!("Pausing container: {}", id);

        docker
            .pause_container(id)
            .await
            .map_err(|e| {
                error!("Failed to pause container {}: {}", id, e);
                match e {
                    bollard::errors::Error::DockerResponseServerError { status_code: 404, .. } => {
                        AppError::ContainerNotFound { id: id.to_string() }
                    }
                    _ => AppError::DockerConnection(e)
                }
            })?;

        info!("Successfully paused container: {}", id);
        Ok(())
    }

    pub async fn unpause_container(id: &str) -> AppResult<()> {
        DockerService::validate_container_id(id)?;
        let docker = DockerService::connect()?;

        info!("Unpausing container: {}", id);

        docker
            .unpause_container(id)
            .await
            .map_err(|e| {
                error!("Failed to unpause container {}: {}", id, e);
                match e {
                    bollard::errors::Error::DockerResponseServerError { status_code: 404, .. } => {
                        AppError::ContainerNotFound { id: id.to_string() }
                    }
                    _ => AppError::DockerConnection(e)
                }
            })?;

        info!("Successfully unpaused container: {}", id);
        Ok(())
    }

    pub async fn restart_container(id: &str) -> AppResult<()> {
        DockerService::validate_container_id(id)?;
        let docker = DockerService::connect()?;

        info!("Restarting container: {}", id);

        let options = RestartContainerOptions {
            t: DEFAULT_RESTART_TIMEOUT,
        };

        docker
            .restart_container(id, Some(options))
            .await
            .map_err(|e| {
                error!("Failed to restart container {}: {}", id, e);
                match e {
                    bollard::errors::Error::DockerResponseServerError { status_code: 404, .. } => {
                        AppError::ContainerNotFound { id: id.to_string() }
                    }
                    _ => AppError::DockerConnection(e)
                }
            })?;

        info!("Successfully restarted container: {}", id);
        Ok(())
    }

    pub async fn remove_container(id: &str) -> AppResult<()> {
        DockerService::validate_container_id(id)?;
        let docker = DockerService::connect()?;

        info!("Removing container: {}", id);

        let options = RemoveContainerOptions {
            force: false,
            link: false,
            v: false,
            ..Default::default()
        };

        docker
            .remove_container(id, Some(options))
            .await
            .map_err(|e| {
                error!("Failed to remove container {}: {}", id, e);
                match e {
                    bollard::errors::Error::DockerResponseServerError { status_code: 404, .. } => {
                        AppError::ContainerNotFound { id: id.to_string() }
                    }
                    _ => AppError::DockerConnection(e)
                }
            })?;

        info!("Successfully removed container: {}", id);
        Ok(())
    }

    pub async fn force_remove_container(id: &str) -> AppResult<()> {
        DockerService::validate_container_id(id)?;
        let docker = DockerService::connect()?;

        info!("Force removing container: {}", id);

        let options = RemoveContainerOptions {
            force: true,
            link: false,
            v: false,
            ..Default::default()
        };

        docker
            .remove_container(id, Some(options))
            .await
            .map_err(|e| {
                error!("Failed to force remove container {}: {}", id, e);
                match e {
                    bollard::errors::Error::DockerResponseServerError { status_code: 404, .. } => {
                        AppError::ContainerNotFound { id: id.to_string() }
                    }
                    _ => AppError::DockerConnection(e)
                }
            })?;

        info!("Successfully force removed container: {}", id);
        Ok(())
    }

    pub async fn open_terminal(id: &str) -> AppResult<()> {
        DockerService::validate_container_id(id)?;
        let docker = DockerService::connect()?;
        
        info!("Opening terminal for container: {}", id);
        
        // Check if container exists and is running
        let containers = docker.list_containers(None::<ListContainersOptions<String>>)
            .await
            .map_err(|e| {
                error!("Failed to list containers for terminal check: {}", e);
                AppError::DockerConnection(e)
            })?;
        
        let container = containers.iter().find(|c| {
            c.id.as_ref().map_or(false, |cid| cid.starts_with(id))
        }).ok_or_else(|| {
            warn!("Container {} not found for terminal access", id);
            AppError::ContainerNotFound { id: id.to_string() }
        })?;
        
        let state = container.state.as_ref().unwrap_or(&"unknown".to_string());
        if state != "running" {
            warn!("Container {} is not running (state: {})", id, state);
            return Err(AppError::OperationFailed(
                format!("Container is not running (current state: {})", state)
            ));
        }

        Self::launch_terminal(id).await
    }

    async fn launch_terminal(id: &str) -> AppResult<()> {
        #[cfg(target_os = "macos")]
        {
            Self::launch_terminal_macos(id).await
        }

        #[cfg(target_os = "linux")]
        {
            Self::launch_terminal_linux(id).await
        }

        #[cfg(target_os = "windows")]
        {
            Self::launch_terminal_windows(id).await
        }
    }

    #[cfg(target_os = "macos")]
    async fn launch_terminal_macos(id: &str) -> AppResult<()> {
        let shell_commands = ["bash", "sh"];
        
        for shell in shell_commands.iter() {
            match Command::new("osascript")
                .args([
                    "-e",
                    &format!("tell application \"Terminal\" to do script \"docker exec -it {} {}\"", id, shell)
                ])
                .status()
            {
                Ok(status) if status.success() => {
                    info!("Successfully launched terminal for container {} with shell {}", id, shell);
                    return Ok(());
                }
                Ok(status) => {
                    warn!("Terminal launch failed with status: {} for shell: {}", status, shell);
                }
                Err(e) => {
                    warn!("Failed to execute osascript for shell {}: {}", shell, e);
                }
            }
        }
        
        Err(AppError::OperationFailed("Failed to open terminal on macOS".to_string()))
    }

    #[cfg(target_os = "linux")]
    async fn launch_terminal_linux(id: &str) -> AppResult<()> {
        let terminal_configs = [
            ("gnome-terminal", vec!["--", "docker", "exec", "-it", id, "bash"]),
            ("konsole", vec!["-e", "docker", "exec", "-it", id, "bash"]),
            ("xterm", vec!["-e", "docker", "exec", "-it", id, "bash"]),
            ("alacritty", vec!["-e", "docker", "exec", "-it", id, "bash"]),
            ("kitty", vec!["-e", "docker", "exec", "-it", id, "bash"]),
            ("tilix", vec!["-e", "docker", "exec", "-it", id, "bash"]),
            ("terminator", vec!["-e", "docker", "exec", "-it", id, "bash"]),
        ];

        // Try bash first
        for (terminal, args) in terminal_configs.iter() {
            match Command::new(terminal).args(args).status() {
                Ok(status) if status.success() => {
                    info!("Successfully launched {} terminal for container {}", terminal, id);
                    return Ok(());
                }
                Ok(_) => continue,
                Err(_) => continue,
            }
        }

        // If bash failed, try with sh
        let terminal_configs_sh = [
            ("gnome-terminal", vec!["--", "docker", "exec", "-it", id, "sh"]),
            ("konsole", vec!["-e", "docker", "exec", "-it", id, "sh"]),
            ("xterm", vec!["-e", "docker", "exec", "-it", id, "sh"]),
            ("alacritty", vec!["-e", "docker", "exec", "-it", id, "sh"]),
            ("kitty", vec!["-e", "docker", "exec", "-it", id, "sh"]),
            ("tilix", vec!["-e", "docker", "exec", "-it", id, "sh"]),
            ("terminator", vec!["-e", "docker", "exec", "-it", id, "sh"]),
        ];

        for (terminal, args) in terminal_configs_sh.iter() {
            match Command::new(terminal).args(args).status() {
                Ok(status) if status.success() => {
                    info!("Successfully launched {} terminal for container {} with sh", terminal, id);
                    return Ok(());
                }
                Ok(_) => continue,
                Err(_) => continue,
            }
        }

        Err(AppError::OperationFailed(
            "No suitable terminal found. Please install a terminal emulator like gnome-terminal, konsole, xterm, alacritty, kitty, tilix, or terminator".to_string()
        ))
    }

    #[cfg(target_os = "windows")]
    async fn launch_terminal_windows(id: &str) -> AppResult<()> {
        let shell_commands = ["bash", "sh"];
        
        for shell in shell_commands.iter() {
            match Command::new("cmd")
                .args(["/C", "start", "docker", "exec", "-it", id, shell])
                .status()
            {
                Ok(status) if status.success() => {
                    info!("Successfully launched terminal for container {} with shell {}", id, shell);
                    return Ok(());
                }
                Ok(status) => {
                    warn!("Terminal launch failed with status: {} for shell: {}", status, shell);
                }
                Err(e) => {
                    warn!("Failed to execute cmd for shell {}: {}", shell, e);
                }
            }
        }
        
        Err(AppError::OperationFailed("Failed to open terminal on Windows".to_string()))
    }

    pub async fn get_container_logs(id: &str) -> AppResult<Vec<String>> {
        DockerService::validate_container_id(id)?;
        let docker = DockerService::connect()?;

        info!("Fetching logs for container: {}", id);

        let options = LogsOptions::<String> {
            stdout: true,
            stderr: true,
            timestamps: true,
            tail: "1000".to_string(), // Limit to last 1000 lines
            ..Default::default()
        };

        let mut logs_stream = docker.logs(id, Some(options));
        let mut logs = Vec::new();
        
        while let Some(log_entry) = logs_stream.next().await {
            match log_entry {
                Ok(bollard::container::LogOutput::StdOut { message }) |
                Ok(bollard::container::LogOutput::StdErr { message }) => {
                    if let Ok(log_line) = String::from_utf8(message.to_vec()) {
                        logs.push(log_line.trim_end().to_string());
                    }
                },
                Ok(_) => continue,
                Err(e) => {
                    error!("Error reading log stream for container {}: {}", id, e);
                    return Err(AppError::DockerConnection(e));
                }
            }
        }

        if logs.is_empty() {
            debug!("No logs available for container {}", id);
            logs.push("No logs available for this container".to_string());
        }

        info!("Retrieved {} log lines for container {}", logs.len(), id);
        Ok(logs)
    }

    pub async fn get_container_files(id: &str) -> AppResult<HashMap<String, serde_json::Value>> {
        DockerService::validate_container_id(id)?;
        let docker = DockerService::connect()?;

        info!("Fetching file system information for container: {}", id);

        // Get container inspection to get filesystem info
        let container_info = docker
            .inspect_container(id, None)
            .await
            .map_err(|e| {
                error!("Failed to inspect container {}: {}", id, e);
                match e {
                    bollard::errors::Error::DockerResponseServerError { status_code: 404, .. } => {
                        AppError::ContainerNotFound { id: id.to_string() }
                    }
                    _ => AppError::DockerConnection(e)
                }
            })?;

        let mut file_info = HashMap::new();
        
        // Add basic container filesystem information
        if let Some(graph_driver) = container_info.graph_driver {
            file_info.insert("graph_driver".to_string(), serde_json::to_value(graph_driver)?);
        }
        
        if let Some(mounts) = container_info.mounts {
            file_info.insert("mounts".to_string(), serde_json::to_value(mounts)?);
        }
        
        // Add basic filesystem stats
        file_info.insert("container_id".to_string(), serde_json::Value::String(id.to_string()));
        file_info.insert("status".to_string(), serde_json::Value::String("available".to_string()));

        info!("Retrieved file system information for container {}", id);
        Ok(file_info)
    }

    pub async fn prune_containers() -> AppResult<()> {
        let docker = DockerService::connect()?;

        info!("Pruning stopped containers");

        let result = docker
            .prune_containers(None::<bollard::container::PruneContainersOptions<String>>)
            .await
            .map_err(|e| {
                error!("Failed to prune containers: {}", e);
                AppError::DockerConnection(e)
            })?;

        let space_reclaimed = result.space_reclaimed.unwrap_or(0);
        let containers_deleted = result.containers_deleted.as_ref().map_or(0, |v| v.len());
        
        info!("Pruned {} containers, reclaimed {} bytes", containers_deleted, space_reclaimed);
        Ok(())
    }
}


