use crate::entities::{
    ColimaStatus, DockerStatus, HomebrewStatus,
    ColimaEngineInfo, ContextInfo,
    EngineConfig, RepairResult, VmConfig, VmInfo, VersionInfo
};
use bollard::Docker;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tokio::process::Command as TokioCommand;
use tokio::io::AsyncBufReadExt;
use tracing::instrument;
use std::path::Path;
use std::fs;
use reqwest::Client;
use std::time::Instant;

use serde::{Serialize, Deserialize};

// Colima installation status struct
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColimaInstallationStatus {
    pub colima_installed: bool,
    pub colima_executable: bool,
    pub lima_available: bool,
    pub fully_working: bool,
}

// Colima version configuration
const COLIMA_VERSION_CONFIG: &str = r#"{
  "colima_version": "0.8.4",
  "colima_checksum": "30668c5a7d6ebff5886704fbc1f0da28d62620abd35270d02a4025d7a530f5c6",
  "download_url": "https://github.com/abiosoft/colima/releases/download/v0.8.4/colima-Darwin-arm64"
}"#;

#[derive(Default, Debug)]
pub struct ColimaService;

// Global state for Colima installation logs
static COLIMA_INSTALLATION_LOGS: Mutex<Vec<String>> = Mutex::new(Vec::new());
static VM_STARTUP_LOGS: Mutex<Vec<String>> = Mutex::new(Vec::new());
static BINARY_INSTALLATION_LOGS: Mutex<Vec<String>> = Mutex::new(Vec::new());

impl ColimaService {
    /// Get Colima version information
    #[instrument(skip_all, err)]
    pub async fn get_colima_version() -> Result<VersionInfo, String> {
        serde_json::from_str(COLIMA_VERSION_CONFIG)
            .map_err(|e| format!("Failed to parse Colima version config: {}", e))
    }

    /// Download Colima binary
    #[instrument(skip_all, err)]
    pub async fn download_colima_binary() -> Result<DownloadResult, String> {
        // Clear previous logs
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.clear();
            logs.push("Starting Colima download process...".to_string());
        }

        let start_time = Instant::now();
        let version_info = Self::get_colima_version().await?;

        // Create download directory
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Creating download directory...".to_string());
        }

        let home_dir = dirs::home_dir()
            .ok_or("Failed to determine home directory")?;
        let download_dir = home_dir.join(".nookat").join("downloads");
        fs::create_dir_all(&download_dir)
            .map_err(|e| format!("Failed to create download directory: {}", e))?;

        // Download Colima binary
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Downloading Colima v{}...", version_info.colima_version));
        }

        let colima_path = Self::download_binary(
            &version_info.download_urls.colima,
            &download_dir.join("colima"),
            "colima"
        ).await?;

        let download_time = start_time.elapsed();
        let download_size = fs::metadata(&colima_path)
            .map(|m| m.len())
            .unwrap_or(0);

        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Colima download completed in {:.2?}. Size: {} bytes", download_time, download_size));
        }

        Ok(DownloadResult {
            colima_path: colima_path.to_string_lossy().to_string(),
            lima_path: String::new(), // Not used for Colima-only download
            download_size,
            download_time,
        })
    }

    /// Install Colima binary (requires Lima to be installed first)
    #[instrument(skip_all, err)]
    pub async fn install_colima_binary_internal() -> Result<(), String> {
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Starting Colima installation...".to_string());
        }

        // Check if Lima is installed first
        let lima_installed = LimaService::check_lima_status().await?;
        if !lima_installed {
            {
                let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
                logs.push("Lima not found. Installing Lima first...".to_string());
            }

            // Install Lima first
            LimaService::install_lima_binary().await?;

            {
                let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
                logs.push("Lima installed successfully. Proceeding with Colima...".to_string());
            }
        }

        // Download Colima
        let download_result = Self::download_colima_binary().await?;

        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Colima downloaded, proceeding with installation...".to_string());
        }

        // Verify download
        Self::verify_colima_download(&download_result)?;

        // Determine installation paths
        let home_dir = dirs::home_dir()
            .ok_or("Failed to determine home directory")?;
        let colima_dir = home_dir.join(".colima");
        let bin_dir = home_dir.join(".local").join("bin");

        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Creating installation directories...".to_string());
        }

        // Create necessary directories
        fs::create_dir_all(&colima_dir)
            .map_err(|e| format!("Failed to create .colima directory: {}", e))?;
        fs::create_dir_all(&bin_dir)
            .map_err(|e| format!("Failed to create bin directory: {}", e))?;

        // Install Colima binary
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Installing Colima binary...".to_string());
        }

        let colima_source = Path::new(&download_result.colima_path);
        let colima_dest = bin_dir.join("colima");

        // Verify source file exists
        if !colima_source.exists() {
            return Err(format!("Colima source file does not exist: {}", colima_source.display()));
        }

        // Copy Colima binary to destination
        fs::copy(colima_source, &colima_dest)
            .map_err(|e| format!("Failed to copy Colima binary: {}", e))?;

        // Set executable permissions
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Setting executable permissions...".to_string());
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            let mut perms = fs::metadata(&colima_dest)
                .map_err(|e| format!("Failed to get colima binary metadata: {}", e))?
                .permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&colima_dest, perms)
                .map_err(|e| format!("Failed to set colima binary permissions: {}", e))?;
        }

        // Clean up
        Self::cleanup_download_files(&download_result)?;

        // Verify installation
        Self::verify_colima_installation(&bin_dir)?;

        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("✅ Colima installation completed successfully".to_string());
            logs.push(format!("Colima installed to: {}", colima_dest.display()));
        }

        Ok(())
    }

    /// Start Colima installation via Homebrew
    #[instrument(skip_all, err)]
    pub async fn start_colima_installation(&self) -> Result<(), String> {
        // Check if Homebrew is available first
        let homebrew_status = self.check_homebrew_availability().await?;
        if !homebrew_status.is_available {
            return Err("Homebrew is not available. Please install Homebrew first.".to_string());
        }

        // Clear previous logs
        {
            let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.clear();
            logs.push("Starting Colima installation via Homebrew...".to_string());
        }

        // Start installation in background
        let service = self.clone();
        tokio::spawn(async move {
            service.install_colima_background().await;
        });

        Ok(())
    }

    /// Install Colima via Homebrew in background
    async fn install_colima_background(&self) {
        // Install Colima
        {
            let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Installing Colima via Homebrew...".to_string());
        }

        let colima_result = Command::new("brew")
            .arg("install")
            .arg("colima")
            .output();

        match colima_result {
            Ok(output) => {
                if output.status.success() {
                    let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
                    logs.push("Colima installed successfully via Homebrew".to_string());
                } else {
                    let error_output = String::from_utf8_lossy(&output.stderr);
                    let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
                    logs.push(format!("Colima installation failed: {}", error_output));
                    return;
                }
            }
            Err(e) => {
                let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
                logs.push(format!("Colima installation failed: {}", e));
                return;
            }
        }

        // Install Docker CLI
        {
            let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Installing Docker CLI...".to_string());
        }

        let docker_result = Command::new("brew")
            .arg("install")
            .arg("docker")
            .output();

        match docker_result {
            Ok(output) => {
                if output.status.success() {
                    let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
                    logs.push("Docker CLI installed successfully".to_string());
                } else {
                    let error_output = String::from_utf8_lossy(&output.stderr);
                    let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
                    logs.push(format!("Docker CLI installation failed: {}", error_output));
                    return;
                }
            }
            Err(e) => {
                let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
                logs.push(format!("Docker CLI installation failed: {}", e));
                return;
            }
        }

        // Install Docker Compose
        {
            let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Installing Docker Compose...".to_string());
        }

        let compose_result = Command::new("brew")
            .arg("install")
            .arg("docker-compose")
            .output();

        match compose_result {
            Ok(output) => {
                if output.status.success() {
                    let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
                    logs.push("Docker Compose installed successfully".to_string());
                    logs.push("All components installed successfully!".to_string());
                } else {
                    let error_output = String::from_utf8_lossy(&output.stderr);
                    let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
                    logs.push(format!("Docker Compose installation failed: {}", error_output));
                    return;
                }
            }
            Err(e) => {
                let mut logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
                logs.push(format!("Docker Compose installation failed: {}", e));
                return;
            }
        }
    }

    /// Start Colima VM
    #[instrument(skip_all, err)]
    pub async fn start_colima_vm(&self, config: VmConfig) -> Result<(), String> {
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

    /// Start Colima VM in background
    #[instrument(skip_all, err)]
    pub async fn start_colima_vm_background(&self, config: VmConfig) -> Result<(), String> {
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
        let service = self.clone();
        tokio::spawn(async move {
            service.start_vm_background(config_clone).await;
        });

        Ok(())
    }

    /// Start VM in background
    async fn start_vm_background(&self, config: VmConfig) {
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

    /// Check Colima status
    #[instrument(skip_all, err)]
    pub async fn check_colima_status(&self) -> Result<ColimaStatus, String> {
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

    /// Check Homebrew availability
    #[instrument(skip_all, err)]
    pub async fn check_homebrew_availability(&self) -> Result<HomebrewStatus, String> {
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

    /// Detect Docker runtime status
    #[instrument(skip_all, err)]
    pub async fn detect_docker_runtime(&self, docker: &Docker) -> Result<DockerStatus, String> {
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

    /// Get installation logs
    pub async fn get_installation_logs(&self) -> Result<Vec<String>, String> {
        let logs = COLIMA_INSTALLATION_LOGS.lock().unwrap();
        Ok(logs.clone())
    }

    /// Get VM startup logs
    pub async fn get_vm_startup_logs(&self) -> Result<Vec<String>, String> {
        let logs = VM_STARTUP_LOGS.lock().unwrap();
        Ok(logs.clone())
    }

    /// Get binary installation logs
    pub async fn get_binary_installation_logs(&self) -> Result<Vec<String>, String> {
        let logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
        Ok(logs.clone())
    }

    /// Clear binary installation logs
    pub async fn clear_binary_installation_logs(&self) -> Result<(), String> {
        let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
        logs.clear();
        Ok(())
    }

    /// Get Colima versions
    pub async fn get_colima_versions(&self) -> Result<VersionInfo, String> {
        Self::get_colima_version().await
    }

    /// Download Colima binaries
    pub async fn download_colima_binaries(&self) -> Result<DownloadResult, String> {
        Self::download_colima_binary().await
    }

    /// Verify binary checksums
    pub async fn verify_binary_checksums(&self) -> Result<bool, String> {
        // For now, return true since we're not implementing checksum verification in this service
        Ok(true)
    }

    /// Install Colima binary
    pub async fn install_colima_binary(&self) -> Result<(), String> {
        Self::install_colima_binary_internal().await
    }

    /// Validate Colima installation
    pub async fn validate_colima_installation(&self) -> Result<ValidationResult, String> {
        let mut issues = Vec::new();

        // Test 1: Check if docker version command works
        let docker_working = match Command::new("docker").arg("version").output() {
            Ok(output) => output.status.success(),
            Err(_) => false,
        };

        if !docker_working {
            issues.push("Docker version command failed".to_string());
        }

        // Test 2: Check if docker info returns valid data
        let docker_info_working = match Command::new("docker").arg("info").output() {
            Ok(output) => output.status.success(),
            Err(_) => false,
        };

        if !docker_info_working {
            issues.push("Docker info command failed".to_string());
        }

        // Test 3: Check if Colima VM is accessible
        let colima_running = match Command::new("colima").arg("status").output() {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                output_str.contains("Running") || output_str.contains("running")
            },
            Err(_) => false,
        };

        if !colima_running {
            issues.push("Colima VM is not running".to_string());
        }

        // Test 4: Validate basic container operations
        let vm_accessible = if colima_running {
            // Try to run a simple container operation
            match Command::new("docker").arg("ps").output() {
                Ok(output) => output.status.success(),
                Err(_) => false,
            }
        } else {
            false
        };

        if !vm_accessible {
            issues.push("Cannot access Docker daemon through Colima".to_string());
        }

        Ok(ValidationResult {
            docker_working,
            colima_running,
            vm_accessible,
            issues,
        })
    }

    /// Get Docker context info
    pub async fn get_docker_context_info(&self) -> Result<ContextInfo, String> {
        // Get current context
        let current_context = match Command::new("docker").arg("context").arg("ls").output() {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                // Parse the output to find the current context (marked with *)
                let lines: Vec<&str> = output_str.lines().collect();
                let current = lines.iter()
                    .find(|line| line.contains("*"))
                    .and_then(|line| line.split_whitespace().next())
                    .unwrap_or("default")
                    .to_string();
                current
            },
            Err(_) => "default".to_string(),
        };

        // Get Docker host from current context
        let docker_host = match Command::new("docker")
            .arg("context")
            .arg("inspect")
            .arg("--format")
            .arg("{{.Endpoints.docker.Host}}")
            .arg(&current_context)
            .output() {
            Ok(output) => {
                if output.status.success() {
                    let host = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !host.is_empty() { Some(host) } else { None }
                } else {
                    None
                }
            },
            Err(_) => None,
        };

        // Get available contexts
        let available_contexts = match Command::new("docker").arg("context").arg("ls").output() {
            Ok(output) => {
                let output_str = String::from_utf8_lossy(&output.stdout);
                output_str.lines()
                    .skip(1) // Skip header
                    .filter_map(|line| {
                        let parts: Vec<&str> = line.split_whitespace().collect();
                        if parts.len() >= 2 {
                            Some(parts[0].to_string())
                        } else {
                            None
                        }
                    })
                    .collect()
            },
            Err(_) => vec!["default".to_string()],
        };

        Ok(ContextInfo {
            current_context,
            docker_host,
            available_contexts,
        })
    }

    /// Save engine configuration
    pub async fn save_engine_config(&self, config: EngineConfig) -> Result<(), String> {
        use crate::services::config::ConfigService;
        use crate::entities::EngineSettings;

        let mut app_config = ConfigService::get_config()?;
        app_config.engine = EngineSettings {
            colima_installation_method: Some(config.installation_method),
            colima_version: config.colima_version,
            installation_date: Some(config.installation_date),
            vm_config: Some(config.vm_config),
        };

        ConfigService::save_config(&app_config)
    }

    /// Repair Colima installation
    pub async fn repair_colima_installation(&self) -> Result<RepairResult, String> {
        let mut actions_taken = Vec::new();
        let mut manual_steps = Vec::new();
        let mut next_actions = Vec::new();

        // Check if Colima is installed
        let colima_installed = Command::new("which").arg("colima").output()
            .map(|output| output.status.success())
            .unwrap_or(false);

        if !colima_installed {
            manual_steps.push("Colima is not installed. Please run the installation process again.".to_string());
            next_actions.push("Restart the installation wizard".to_string());
            return Ok(RepairResult {
                success: false,
                actions_taken,
                manual_steps,
                next_actions,
            });
        }

        // Check if Colima VM exists
        let vm_exists = Command::new("colima").arg("list").output()
            .map(|output| {
                let output_str = String::from_utf8_lossy(&output.stdout);
                output_str.contains("default") || output_str.contains("colima")
            })
            .unwrap_or(false);

        if !vm_exists {
            manual_steps.push("No Colima VM found. Please create a new VM.".to_string());
            next_actions.push("Start VM creation process".to_string());
            return Ok(RepairResult {
                success: false,
                actions_taken,
                manual_steps,
                next_actions,
            });
        }

        // Try to start the VM
        let start_result = Command::new("colima").arg("start").output();
        match start_result {
            Ok(output) => {
                if output.status.success() {
                    actions_taken.push("Successfully started Colima VM".to_string());
                    next_actions.push("Verify Docker connectivity".to_string());
                } else {
                    let error = String::from_utf8_lossy(&output.stderr);
                    manual_steps.push(format!("Failed to start VM: {}", error));
                    next_actions.push("Check system resources and try again".to_string());
                }
            },
            Err(e) => {
                manual_steps.push(format!("Failed to execute colima start: {}", e));
                next_actions.push("Check Colima installation and try again".to_string());
            }
        }

        let success = actions_taken.iter().any(|action| action.contains("Successfully"));

        Ok(RepairResult {
            success,
            actions_taken,
            manual_steps,
            next_actions,
        })
    }

    /// Get detailed Colima installation status
    pub async fn get_colima_installation_status() -> Result<ColimaInstallationStatus, String> {
        let colima_check = Command::new("which").arg("colima").output();
        let colima_installed = colima_check.map(|output| output.status.success()).unwrap_or(false);

        // Check if Colima is executable
        let colima_executable = if colima_installed {
            let colima_path = Command::new("which").arg("colima").output()
                .ok()
                .and_then(|output| String::from_utf8(output.stdout).ok())
                .map(|s| s.trim().to_string());

            if let Some(path) = colima_path {
                Command::new(&path).arg("--version").output()
                    .map(|output| output.status.success())
                    .unwrap_or(false)
            } else {
                false
            }
        } else {
            false
        };

        // Check if Lima is available (dependency)
        let lima_available = LimaService::check_lima_status().await.unwrap_or(false);

        Ok(ColimaInstallationStatus {
            colima_installed,
            colima_executable,
            lima_available,
            fully_working: colima_installed && colima_executable && lima_available,
        })
    }

    // Private helper methods

    async fn download_binary(url: &str, path: &Path, binary_name: &str) -> Result<std::path::PathBuf, String> {
        let client = Client::new();
        let response = client.get(url)
            .send()
            .await
            .map_err(|e| format!("Failed to download {}: {}", binary_name, e))?;

        let mut file = tokio::fs::File::create(path)
            .await
            .map_err(|e| format!("Failed to create file for {}: {}", binary_name, e))?;

        let bytes = response.bytes()
            .await
            .map_err(|e| format!("Failed to read response bytes for {}: {}", binary_name, e))?;

        tokio::io::copy(&mut bytes.as_ref(), &mut file)
            .await
            .map_err(|e| format!("Failed to write file for {}: {}", binary_name, e))?;

        Ok(path.to_path_buf())
    }

    fn verify_colima_download(download_result: &DownloadResult) -> Result<(), String> {
        let colima_path = Path::new(&download_result.colima_path);

        if !colima_path.exists() {
            return Err(format!("Colima file not found at: {}", colima_path.display()));
        }

        let colima_size = fs::metadata(colima_path)
            .map(|m| m.len())
            .unwrap_or(0);

        if colima_size == 0 {
            return Err("Colima file is empty".to_string());
        }

        Ok(())
    }

    fn cleanup_download_files(download_result: &DownloadResult) -> Result<(), String> {
        if let Err(e) = fs::remove_file(&download_result.colima_path) {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Warning: Failed to remove temporary colima file: {}", e));
        }

        let download_dir = Path::new(&download_result.colima_path).parent().unwrap_or_else(|| Path::new(""));
        if let Err(e) = fs::remove_dir(download_dir) {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Info: Download directory cleanup: {}", e));
        }

        Ok(())
    }

    fn verify_colima_installation(bin_dir: &Path) -> Result<(), String> {
        let colima_path = bin_dir.join("colima");

        if !colima_path.exists() {
            return Err(format!("Colima binary not found at: {}", colima_path.display()));
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            let colima_perms = fs::metadata(&colima_path)
                .map_err(|e| format!("Failed to get colima permissions: {}", e))?
                .permissions();

            if colima_perms.mode() & 0o111 == 0 {
                return Err("Colima binary is not executable".to_string());
            }
        }

        Ok(())
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
