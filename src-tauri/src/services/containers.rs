use bollard::models::ContainerSummary;
use bollard::{
    container::{ListContainersOptions, StartContainerOptions, StopContainerOptions, RestartContainerOptions, RemoveContainerOptions},
    Docker,
};
use std::process::Command;

#[derive(Default, Debug)]
pub struct ContainersService {}

impl ContainersService {
    pub async fn get_containers() -> Vec<ContainerSummary> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        let options: ListContainersOptions<String> = ListContainersOptions {
            all: true,
            size: true,
            ..Default::default()
        };

        let containers = &docker
            .list_containers(Some(options))
            .await
            .expect("Failed to list containers");

        containers.iter().map(|c| c.clone()).collect()
    }

    pub async fn start_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        let options = StartContainerOptions::<String> {
            ..Default::default()
        };

        docker
            .start_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to start container: {}", e))?;

        Ok(())
    }

    pub async fn stop_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

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

    pub async fn pause_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        docker
            .pause_container(id)
            .await
            .map_err(|e| format!("Failed to pause container: {}", e))?;

        Ok(())
    }

    pub async fn unpause_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

        docker
            .unpause_container(id)
            .await
            .map_err(|e| format!("Failed to unpause container: {}", e))?;

        Ok(())
    }

    pub async fn restart_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

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

    pub async fn remove_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

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

    pub async fn force_remove_container(id: &str) -> Result<(), String> {
        let docker = Docker::connect_with_local_defaults().unwrap();

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

    pub async fn open_terminal(id: &str) -> Result<(), String> {
        // First, verify that the container exists and is running
        let docker = Docker::connect_with_local_defaults()
            .map_err(|e| format!("Failed to connect to Docker: {}", e))?;
        
        // Check if container exists and is running
        let containers = docker.list_containers(None::<ListContainersOptions<String>>)
            .await
            .map_err(|e| format!("Failed to list containers: {}", e))?;
        
        let container_exists = containers.iter().any(|c| c.id.as_ref().unwrap_or(&"".to_string()).starts_with(id));
        if !container_exists {
            return Err("Container not found".to_string());
        }
        
        let container_running = containers.iter().any(|c| {
            c.id.as_ref().unwrap_or(&"".to_string()).starts_with(id) && 
            c.state.as_ref().unwrap_or(&"".to_string()) == "running"
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
                        &format!("tell application \"Terminal\" to do script \"docker exec -it {} {}\"", id, shell)
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
                ("gnome-terminal", &["--", "docker", "exec", "-it", id, "bash"]),
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
}
