use crate::entities::{ColimaStatus, DockerStatus, VmInfo, VmConfig, HomebrewStatus};
use bollard::Docker;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tokio::process::Command as TokioCommand;
use tokio::io::AsyncBufReadExt;
use tracing::instrument;

#[derive(Default, Debug)]
pub struct EngineSetupService {}

// Global state to store installation progress
static INSTALLATION_LOGS: Mutex<Vec<String>> = Mutex::new(Vec::new());
static VM_STARTUP_LOGS: Mutex<Vec<String>> = Mutex::new(Vec::new());

impl EngineSetupService {
    #[instrument(skip_all, err)]
    pub async fn detect_docker_runtime(docker: &Docker) -> Result<DockerStatus, String> {
        // Try to get Docker info to check if daemon is accessible
        match docker.info().await {
            Ok(_) => Ok(DockerStatus::Running),
            Err(_) => {
                // Check if Docker daemon socket exists but is not responding
                #[cfg(target_os = "macos")]
                {
                    if std::path::Path::new("/var/run/docker.sock").exists() {
                        return Ok(DockerStatus::Error);
                    }
                }
                Ok(DockerStatus::Stopped)
            }
        }
    }

    #[instrument(skip_all, err)]
    pub async fn check_homebrew_availability() -> Result<HomebrewStatus, String> {
        // Check if Homebrew is available
        let brew_check = Command::new("which")
            .arg("brew")
            .output()
            .map_err(|e| format!("Failed to check Homebrew availability: {}", e))?;

        if !brew_check.status.success() {
            return Ok(HomebrewStatus {
                is_available: false,
                version: None,
            });
        }

        // Get Homebrew version
        let version_output = Command::new("brew")
            .arg("--version")
            .output()
            .map_err(|e| format!("Failed to get Homebrew version: {}", e))?;

        let version = if version_output.status.success() {
            let version_text = String::from_utf8_lossy(&version_output.stdout);
            Some(version_text.trim().to_string())
        } else {
            None
        };

        Ok(HomebrewStatus {
            is_available: true,
            version,
        })
    }

    #[instrument(skip_all, err)]
    pub async fn start_colima_installation() -> Result<(), String> {
        // Check if Homebrew is available first
        let homebrew_status = Self::check_homebrew_availability().await?;
        if !homebrew_status.is_available {
            return Err("Homebrew is not available. Please install Homebrew first.".to_string());
        }

        // Clear previous logs
        {
            let mut logs = INSTALLATION_LOGS.lock().unwrap();
            logs.clear();
            logs.push("Starting Colima installation...".to_string());
        }

        // Start installation in background
        tokio::spawn(async move {
            Self::install_colima_background().await;
        });

        Ok(())
    }

    async fn install_colima_background() {
        // Install Colima
        {
            let mut logs = INSTALLATION_LOGS.lock().unwrap();
            logs.push("Installing Colima...".to_string());
        }

        let colima_result = Command::new("brew")
            .arg("install")
            .arg("colima")
            .output();

        match colima_result {
            Ok(output) => {
                if output.status.success() {
                    let mut logs = INSTALLATION_LOGS.lock().unwrap();
                    logs.push("Colima installed successfully".to_string());
                } else {
                    let error_output = String::from_utf8_lossy(&output.stderr);
                    let mut logs = INSTALLATION_LOGS.lock().unwrap();
                    logs.push(format!("Colima installation failed: {}", error_output));
                    return;
                }
            }
            Err(e) => {
                let mut logs = INSTALLATION_LOGS.lock().unwrap();
                logs.push(format!("Colima installation failed: {}", e));
                return;
            }
        }

        // Install Docker CLI
        {
            let mut logs = INSTALLATION_LOGS.lock().unwrap();
            logs.push("Installing Docker CLI...".to_string());
        }

        let docker_result = Command::new("brew")
            .arg("install")
            .arg("docker")
            .output();

        match docker_result {
            Ok(output) => {
                if output.status.success() {
                    let mut logs = INSTALLATION_LOGS.lock().unwrap();
                    logs.push("Docker CLI installed successfully".to_string());
                } else {
                    let error_output = String::from_utf8_lossy(&output.stderr);
                    let mut logs = INSTALLATION_LOGS.lock().unwrap();
                    logs.push(format!("Docker CLI installation failed: {}", error_output));
                    return;
                }
            }
            Err(e) => {
                let mut logs = INSTALLATION_LOGS.lock().unwrap();
                logs.push(format!("Docker CLI installation failed: {}", e));
                return;
            }
        }

        // Install Docker Compose
        {
            let mut logs = INSTALLATION_LOGS.lock().unwrap();
            logs.push("Installing Docker Compose...".to_string());
        }

        let compose_result = Command::new("brew")
            .arg("install")
            .arg("docker-compose")
            .output();

        match compose_result {
            Ok(output) => {
                if output.status.success() {
                    let mut logs = INSTALLATION_LOGS.lock().unwrap();
                    logs.push("Docker Compose installed successfully".to_string());
                    logs.push("All components installed successfully!".to_string());
                } else {
                    let error_output = String::from_utf8_lossy(&output.stderr);
                    let mut logs = INSTALLATION_LOGS.lock().unwrap();
                    logs.push(format!("Docker Compose installation failed: {}", error_output));
                    return;
                }
            }
            Err(e) => {
                let mut logs = INSTALLATION_LOGS.lock().unwrap();
                logs.push(format!("Docker Compose installation failed: {}", e));
                return;
            }
        }
    }

    #[instrument(skip_all, err)]
    pub async fn get_installation_logs() -> Result<Vec<String>, String> {
        let logs = INSTALLATION_LOGS.lock().unwrap();
        Ok(logs.clone())
    }

    #[instrument(skip_all, err)]
    pub async fn start_colima_vm(config: VmConfig) -> Result<(), String> {
        // Build colima start command with configuration
        let mut command = Command::new("colima");
        command.arg("start");

        // Add CPU cores
        command.arg("--cpu").arg(config.cpu_cores.to_string());

        // Add memory
        command.arg("--memory").arg(format!("{}", config.memory_gb));

        // Add disk size
        command.arg("--disk").arg(format!("{}", config.disk_gb));

        // Add architecture if not auto
        if config.architecture != "auto" {
            command.arg("--arch").arg(&config.architecture);
        }

        // Execute the command
        let output = command
            .output()
            .map_err(|e| format!("Failed to start Colima VM: {}", e))?;

        if !output.status.success() {
            let error_output = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to start Colima VM: {}", error_output));
        }

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn start_colima_vm_background(config: VmConfig) -> Result<(), String> {
        // Clear previous logs
        {
            let mut logs = VM_STARTUP_LOGS.lock().unwrap();
            logs.clear();
            logs.push("Starting Colima VM...".to_string());
            logs.push(format!("Configuration: {} CPU cores, {}GB RAM, {}GB disk, {} architecture",
                config.cpu_cores, config.memory_gb, config.disk_gb, config.architecture));
        }

        // Start VM startup in background
        let config_clone = config.clone();
        tokio::spawn(async move {
            Self::start_vm_background(config_clone).await;
        });

        Ok(())
    }

    async fn start_vm_background(config: VmConfig) {
        // Build colima start command with configuration
        let mut command = TokioCommand::new("colima");
        command.arg("start");

        // Add CPU cores
        command.arg("--cpu").arg(config.cpu_cores.to_string());

        // Add memory
        command.arg("--memory").arg(format!("{}", config.memory_gb));

        // Add disk size
        command.arg("--disk").arg(format!("{}", config.disk_gb));

        // Add architecture if not auto
        if config.architecture != "auto" {
            command.arg("--arch").arg(&config.architecture);
        }

        // Execute the command with progress streaming
        let child = command
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn();

        let mut child = match child {
            Ok(child) => child,
            Err(e) => {
                let mut logs = VM_STARTUP_LOGS.lock().unwrap();
                logs.push(format!("Failed to start Colima VM: {}", e));
                return;
            }
        };

        let stdout = child.stdout.take().ok_or("Failed to capture stdout");
        let stderr = child.stderr.take().ok_or("Failed to capture stderr");

        let stdout = match stdout {
            Ok(stdout) => stdout,
            Err(_) => {
                let mut logs = VM_STARTUP_LOGS.lock().unwrap();
                logs.push("Failed to capture stdout".to_string());
                return;
            }
        };

        let stderr = match stderr {
            Ok(stderr) => stderr,
            Err(_) => {
                let mut logs = VM_STARTUP_LOGS.lock().unwrap();
                logs.push("Failed to capture stderr".to_string());
                return;
            }
        };

        // Stream stdout
        let stdout_handle = tokio::spawn(async move {
            let reader = tokio::io::BufReader::new(stdout);
            let mut lines = reader.lines();
            let mut logs = Vec::new();

            while let Ok(Some(line)) = lines.next_line().await {
                logs.push(line);
            }
            logs
        });

        // Stream stderr
        let stderr_handle = tokio::spawn(async move {
            let reader = tokio::io::BufReader::new(stderr);
            let mut lines = reader.lines();
            let mut logs = Vec::new();

            while let Ok(Some(line)) = lines.next_line().await {
                logs.push(line);
            }
            logs
        });

        // Wait for the process to complete
        let status = child.wait().await;
        let status = match status {
            Ok(status) => status,
            Err(e) => {
                let mut logs = VM_STARTUP_LOGS.lock().unwrap();
                logs.push(format!("Failed to wait for process: {}", e));
                return;
            }
        };

        // Wait for streaming to complete and collect logs
        let (stdout_result, stderr_result) = tokio::join!(stdout_handle, stderr_handle);

        // Collect all logs
        if let Ok(logs) = stdout_result {
            let mut vm_logs = VM_STARTUP_LOGS.lock().unwrap();
            vm_logs.extend(logs);
        }
        if let Ok(logs) = stderr_result {
            let mut vm_logs = VM_STARTUP_LOGS.lock().unwrap();
            vm_logs.extend(logs);
        }

        if !status.success() {
            let mut logs = VM_STARTUP_LOGS.lock().unwrap();
            logs.push("VM startup failed".to_string());
            return;
        }

        let mut logs = VM_STARTUP_LOGS.lock().unwrap();
        logs.push("Colima VM started successfully!".to_string());
    }

    #[instrument(skip_all, err)]
    pub async fn get_vm_startup_logs() -> Result<Vec<String>, String> {
        let logs = VM_STARTUP_LOGS.lock().unwrap();
        Ok(logs.clone())
    }

    #[cfg(not(target_os = "macos"))]
    #[instrument(skip_all, err)]
    pub async fn check_colima_status() -> Result<ColimaStatus, String> {
        todo!()
    }

    #[cfg(target_os = "macos")]
    #[instrument(skip_all, err)]
    pub async fn check_colima_status() -> Result<ColimaStatus, String> {
        // Check if colima is installed
        let colima_installed = Command::new("which")
            .arg("colima")
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false);

        if !colima_installed {
            return Ok(ColimaStatus {
                is_installed: false,
                is_running: false,
                vm_info: None,
            });
        }

        // Check colima status
        let status_output = Command::new("colima")
            .arg("status")
            .output()
            .map_err(|e| format!("Failed to execute colima status: {}", e))?;

        if !status_output.status.success() {
            return Ok(ColimaStatus {
                is_installed: true,
                is_running: false,
                vm_info: None,
            });
        }

        let status_text = String::from_utf8_lossy(&status_output.stdout);
        let is_running = status_text.contains("Running");

        // Parse VM info if running
        let vm_info = if is_running {
            Self::parse_colima_vm_info(&status_text)
        } else {
            None
        };

        Ok(ColimaStatus {
            is_installed: true,
            is_running,
            vm_info,
        })
    }

    fn parse_colima_vm_info(status_text: &str) -> Option<VmInfo> {
        // Parse CPU info
        let cpu = status_text
            .lines()
            .find(|line| line.contains("CPU:"))
            .and_then(|line| {
                line.split_whitespace()
                    .nth(1)
                    .and_then(|s| s.parse::<u32>().ok())
            })
            .unwrap_or(0);

        // Parse memory info (convert to bytes)
        let memory = status_text
            .lines()
            .find(|line| line.contains("Memory:"))
            .and_then(|line| {
                line.split_whitespace()
                    .nth(1)
                    .and_then(|s| {
                        if s.ends_with("GB") {
                            s.trim_end_matches("GB")
                                .parse::<u64>()
                                .map(|g| g * 1024 * 1024 * 1024)
                                .ok()
                        } else if s.ends_with("MB") {
                            s.trim_end_matches("MB")
                                .parse::<u64>()
                                .map(|m| m * 1024 * 1024)
                                .ok()
                        } else {
                            s.parse::<u64>().ok()
                        }
                    })
            })
            .unwrap_or(0);

        // Parse disk info (convert to bytes)
        let disk = status_text
            .lines()
            .find(|line| line.contains("Disk:"))
            .and_then(|line| {
                line.split_whitespace()
                    .nth(1)
                    .and_then(|s| {
                        if s.ends_with("GB") {
                            s.trim_end_matches("GB")
                                .parse::<u64>()
                                .map(|g| g * 1024 * 1024 * 1024)
                                .ok()
                        } else if s.ends_with("MB") {
                            s.trim_end_matches("MB")
                                .parse::<u64>()
                                .map(|m| m * 1024 * 1024)
                                .ok()
                        } else {
                            s.parse::<u64>().ok()
                        }
                    })
            })
            .unwrap_or(0);

        // Parse architecture
        let architecture = status_text
            .lines()
            .find(|line| line.contains("Arch:"))
            .and_then(|line| {
                line.split_whitespace()
                    .nth(1)
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| "unknown".to_string());

        Some(VmInfo {
            cpu,
            memory,
            disk,
            architecture,
        })
    }
}
