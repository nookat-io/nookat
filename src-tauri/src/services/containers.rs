use bollard::models::ContainerSummary;
use bollard::{
    container::{
        ListContainersOptions, LogsOptions, RemoveContainerOptions, RestartContainerOptions,
        StartContainerOptions, StopContainerOptions,
    },
    Docker,
};
use std::process::Command;

#[derive(Default, Debug)]
pub struct ContainersService {}

impl ContainersService {
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

        Ok(containers.iter().map(|c| c.clone()).collect())
    }

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

    pub async fn stop_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = StopContainerOptions {
            t: 0,
            ..Default::default()
        };

        docker
            .stop_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to stop container: {}", e))?;

        Ok(())
    }

    pub async fn pause_container(docker: &Docker, id: &str) -> Result<(), String> {
        docker
            .pause_container(id)
            .await
            .map_err(|e| format!("Failed to pause container: {}", e))?;

        Ok(())
    }

    pub async fn unpause_container(docker: &Docker, id: &str) -> Result<(), String> {
        docker
            .unpause_container(id)
            .await
            .map_err(|e| format!("Failed to unpause container: {}", e))?;

        Ok(())
    }

    pub async fn restart_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = RestartContainerOptions {
            t: 0,
            ..Default::default()
        };

        docker
            .restart_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to restart container: {}", e))?;

        Ok(())
    }

    pub async fn remove_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = RemoveContainerOptions {
            force: false,
            link: false,
            v: false,
            ..Default::default()
        };

        docker
            .remove_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to remove container: {}", e))?;

        Ok(())
    }

    pub async fn force_remove_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = RemoveContainerOptions {
            force: true,
            link: false,
            v: false,
            ..Default::default()
        };

        docker
            .remove_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to force remove container: {}", e))?;

        Ok(())
    }

    pub async fn open_terminal(docker: &Docker, id: &str) -> Result<(), String> {
        // Check if container exists and is running
        let containers = docker
            .list_containers(None::<ListContainersOptions<String>>)
            .await
            .map_err(|e| format!("Failed to list containers: {}", e))?;

        let container_exists = containers
            .iter()
            .any(|c| c.id.as_ref().unwrap_or(&"".to_string()).starts_with(id));
        if !container_exists {
            return Err("Container not found".to_string());
        }

        let container_running = containers.iter().any(|c| {
            c.id.as_ref().unwrap_or(&"".to_string()).starts_with(id)
                && c.state.as_ref().unwrap_or(&"".to_string()) == "running"
        });
        if !container_running {
            return Err("Container is not running".to_string());
        }

        #[cfg(target_os = "macos")]
        {
            // Try bash first, then fall back to sh
            let shell_commands = ["bash", "sh"];
            let mut success = false;

            for shell in shell_commands.iter() {
                let status = Command::new("osascript")
                    .args([
                        "-e",
                        &format!(
                            "tell application \"Terminal\" to do script \"docker exec -it {} {}\"",
                            id, shell
                        ),
                    ])
                    .status();

                match status {
                    Ok(status) if status.success() => {
                        success = true;
                        break;
                    }
                    _ => continue,
                }
            }

            if !success {
                return Err("Failed to open terminal".to_string());
            }
        }

        #[cfg(target_os = "linux")]
        {
            // Try to detect the default terminal
            let terminal_commands = [
                (
                    "gnome-terminal",
                    &["--", "docker", "exec", "-it", id, "bash"],
                ),
                ("konsole", &["-e", "docker", "exec", "-it", id, "bash"]),
                ("xterm", &["-e", "docker", "exec", "-it", id, "bash"]),
                ("alacritty", &["-e", "docker", "exec", "-it", id, "bash"]),
                ("kitty", &["-e", "docker", "exec", "-it", id, "bash"]),
            ];

            let mut success = false;
            for (terminal, args) in terminal_commands.iter() {
                if let Ok(status) = Command::new(terminal).args(*args).status() {
                    if status.success() {
                        success = true;
                        break;
                    }
                }
            }

            // If bash failed, try with sh
            if !success {
                let terminal_commands_sh = [
                    ("gnome-terminal", &["--", "docker", "exec", "-it", id, "sh"]),
                    ("konsole", &["-e", "docker", "exec", "-it", id, "sh"]),
                    ("xterm", &["-e", "docker", "exec", "-it", id, "sh"]),
                    ("alacritty", &["-e", "docker", "exec", "-it", id, "sh"]),
                    ("kitty", &["-e", "docker", "exec", "-it", id, "sh"]),
                ];

                for (terminal, args) in terminal_commands_sh.iter() {
                    if let Ok(status) = Command::new(terminal).args(*args).status() {
                        if status.success() {
                            success = true;
                            break;
                        }
                    }
                }
            }

            if !success {
                return Err("No suitable terminal found. Please install a terminal emulator like gnome-terminal, konsole, xterm, alacritty, or kitty".to_string());
            }
        }

        #[cfg(target_os = "windows")]
        {
            // Try bash first, then fall back to sh
            let shell_commands = ["bash", "sh"];
            let mut success = false;

            for shell in shell_commands.iter() {
                let status = Command::new("cmd")
                    .args(["/C", "start", "docker", "exec", "-it", id, shell])
                    .status();

                match status {
                    Ok(status) if status.success() => {
                        success = true;
                        break;
                    }
                    _ => continue,
                }
            }

            if !success {
                return Err("Failed to open terminal".to_string());
            }
        }

        Ok(())
    }

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

    pub async fn prune_containers(docker: &Docker) -> Result<(), String> {
        // Use the prune containers method
        docker
            .prune_containers(None::<bollard::container::PruneContainersOptions<String>>)
            .await
            .map_err(|e| format!("Failed to prune containers: {}", e))?;

        Ok(())
    }
}
