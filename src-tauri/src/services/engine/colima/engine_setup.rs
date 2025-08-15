use crate::entities::{ColimaStatus, DockerStatus, VmInfo, VmConfig, HomebrewStatus, VersionInfo, DownloadResult, DownloadProgress, ValidationResult, ContextInfo, EngineConfig, RepairResult};
use bollard::Docker;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tokio::process::Command as TokioCommand;
use tokio::io::AsyncBufReadExt;
use tracing::instrument;
use std::path::Path;
use std::fs;
use reqwest::Client;
use sha2::{Sha256, Digest};
use std::time::Instant;
use flate2::read::GzDecoder;
use tar::Archive;

// Default version configuration as fallback
const DEFAULT_VERSION_CONFIG: &str = r#"{
  "colima_version": "0.8.4",
  "lima_version": "1.2.1",
  "colima_checksum": "30668c5a7d6ebff5886704fbc1f0da28d62620abd35270d02a4025d7a530f5c6",
  "lima_checksum": "4c6e20510b456a4e380500096ecce72c18d0ce98548064dc8089797de2290fdc",
  "download_urls": {
    "colima": "https://github.com/abiosoft/colima/releases/download/v0.8.4/colima-Darwin-arm64",
    "lima": "https://github.com/lima-vm/lima/releases/download/v1.2.1/lima-1.2.1-Darwin-arm64.tar.gz"
  }
}"#;

#[derive(Default, Debug)]
pub struct EngineSetupService {}

// Global state to store installation progress
static INSTALLATION_LOGS: Mutex<Vec<String>> = Mutex::new(Vec::new());
static VM_STARTUP_LOGS: Mutex<Vec<String>> = Mutex::new(Vec::new());
static BINARY_INSTALLATION_LOGS: Mutex<Vec<String>> = Mutex::new(Vec::new());

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
    pub async fn get_binary_installation_logs() -> Result<Vec<String>, String> {
        let logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
        Ok(logs.clone())
    }

    #[instrument(skip_all, err)]
    pub async fn clear_binary_installation_logs() -> Result<(), String> {
        let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
        logs.clear();
        Ok(())
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

    #[instrument(skip_all, err)]
    pub async fn download_colima_binaries() -> Result<DownloadResult, String> {
        // Clear previous logs
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.clear();
            logs.push("Starting binary download process...".to_string());
        }

        let start_time = Instant::now();

        // Load version configuration
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Loading version configuration...".to_string());
        }
        let version_info = Self::get_colima_versions().await?;

        // Create download directory in user's home directory
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

        // Download Lima binary
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Downloading Lima v{}...", version_info.lima_version));
        }
        let lima_path = Self::download_binary(
            &version_info.download_urls.lima,
            &download_dir.join("lima.tar.gz"),
            "lima"
        ).await?;

        let download_time = start_time.elapsed();
        let download_size = fs::metadata(&colima_path)
            .map(|m| m.len())
            .unwrap_or(0) + fs::metadata(&lima_path)
            .map(|m| m.len())
            .unwrap_or(0);

        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Download completed in {:.2?}. Total size: {} bytes", download_time, download_size));
            logs.push(format!("Files downloaded to: {}", download_dir.display()));
        }

        Ok(DownloadResult {
            colima_path: colima_path.to_string_lossy().to_string(),
            lima_path: lima_path.to_string_lossy().to_string(),
            download_size,
            download_time,
        })
    }

    async fn download_binary(url: &str, path: &Path, binary_name: &str) -> Result<std::path::PathBuf, String> {
        let client = Client::new();
        let response = client.get(url)
            .send()
            .await
            .map_err(|e| format!("Failed to download {}: {}", binary_name, e))?;

        let total_size = response.content_length().unwrap_or(0);

        let mut file = tokio::fs::File::create(path)
            .await
            .map_err(|e| format!("Failed to create file for {}: {}", binary_name, e))?;

        let bytes = response.bytes()
            .await
            .map_err(|e| format!("Failed to read response bytes for {}: {}", binary_name, e))?;

        tokio::io::copy(&mut bytes.as_ref(), &mut file)
            .await
            .map_err(|e| format!("Failed to write file for {}: {}", binary_name, e))?;

        let downloaded = bytes.len() as u64;

        // Emit progress event
        let _progress = DownloadProgress {
            binary: binary_name.to_string(),
            downloaded_bytes: downloaded,
            total_bytes: total_size,
            speed_bytes_per_sec: 0, // TODO: Calculate speed
            eta_seconds: 0, // TODO: Calculate ETA
        };

        Ok(path.to_path_buf())
    }

    #[instrument(skip_all, err)]
    pub async fn verify_binary_checksums() -> Result<bool, String> {
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Starting checksum verification...".to_string());
        }

        let version_info = Self::get_colima_versions().await?;

        // Verify Colima checksum
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Verifying Colima binary checksum...".to_string());
        }
        let colima_verified = Self::verify_checksum(
            &version_info.download_urls.colima,
            &version_info.colima_checksum
        ).await?;

        // Verify Lima checksum
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Verifying Lima binary checksum...".to_string());
        }
        let lima_verified = Self::verify_checksum(
            &version_info.download_urls.lima,
            &version_info.lima_checksum
        ).await?;

        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            if colima_verified && lima_verified {
                logs.push("✅ All checksums verified successfully".to_string());
            } else {
                logs.push("❌ Checksum verification failed".to_string());
            }
        }

        Ok(colima_verified && lima_verified)
    }

    async fn verify_checksum(url: &str, expected_checksum: &str) -> Result<bool, String> {
        let client = Client::new();
        let response = client.get(url)
            .send()
            .await
            .map_err(|e| format!("Failed to download for checksum verification: {}", e))?;

        let bytes = response.bytes()
            .await
            .map_err(|e| format!("Failed to read response bytes: {}", e))?;

        let mut hasher = Sha256::new();
        hasher.update(&bytes);
        let actual_checksum = format!("{:x}", hasher.finalize());

        // Log checksum comparison for debugging
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Expected checksum: {}", expected_checksum));
            logs.push(format!("Actual checksum: {}", actual_checksum));
            logs.push(format!("Checksum match: {}", actual_checksum == expected_checksum));
        }

        Ok(actual_checksum == expected_checksum)
    }

    #[instrument(skip_all, err)]
    pub async fn install_colima_binary() -> Result<(), String> {
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Starting binary installation...".to_string());
        }

        // First, download the binaries if not already downloaded
        let download_result = Self::download_colima_binaries().await?;

        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Binaries downloaded, proceeding with installation...".to_string());
        }

        // Verify downloads are valid before proceeding
        Self::check_download_status(&download_result)?;

        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Download validation passed, proceeding with installation...".to_string());
        }

        // Verify checksums before installation
        let checksums_valid = Self::verify_binary_checksums().await?;
        if !checksums_valid {
            return Err("Binary checksum verification failed. Installation aborted.".to_string());
        }

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
            logs.push(format!("Source: {}", Path::new(&download_result.colima_path).display()));
            logs.push(format!("Destination: {}", bin_dir.join("colima").display()));
        }

        let colima_source = Path::new(&download_result.colima_path);
        let colima_dest = bin_dir.join("colima");

        // Verify source file exists before copying
        if !colima_source.exists() {
            return Err(format!("Colima source file does not exist: {}", colima_source.display()));
        }

        // Copy Colima binary to destination
        fs::copy(colima_source, &colima_dest)
            .map_err(|e| format!("Failed to copy Colima binary: {}", e))?;

        // Install Lima binary (extract from tar.gz)
        let lima_source = Path::new(&download_result.lima_path);
        let lima_dest = bin_dir.join("lima");

        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Installing Lima binary...".to_string());
            logs.push(format!("Source: {}", lima_source.display()));
            logs.push(format!("Destination: {}", lima_dest.display()));
        }

        // Verify source file exists before processing
        if !lima_source.exists() {
            return Err(format!("Lima source file does not exist: {}", lima_source.display()));
        }

        // Extract Lima from tar.gz
        if lima_source.extension().and_then(|s| s.to_str()) == Some("gz") {
            // Extract tar.gz file
            let tar_gz = fs::File::open(lima_source)
                .map_err(|e| format!("Failed to open Lima tar.gz: {}", e))?;

            let gz_decoder = GzDecoder::new(tar_gz);
            let mut tar = Archive::new(gz_decoder);

            // Find the lima binary in the archive
            let mut lima_binary_found = false;
            for entry in tar.entries()
                .map_err(|e| format!("Failed to read tar archive: {}", e))? {
                let mut entry = entry
                    .map_err(|e| format!("Failed to read tar entry: {}", e))?;

                let path = entry.path()
                    .map_err(|e| format!("Failed to get entry path: {}", e))?;

                if let Some(file_name) = path.file_name() {
                    if file_name == "lima" {
                        // Extract the lima binary
                        let mut file = fs::File::create(&lima_dest)
                            .map_err(|e| format!("Failed to create lima binary file: {}", e))?;

                        std::io::copy(&mut entry, &mut file)
                            .map_err(|e| format!("Failed to extract lima binary: {}", e))?;

                        lima_binary_found = true;
                        break;
                    }
                }
            }

            if !lima_binary_found {
                return Err("Could not find lima binary in the downloaded archive".to_string());
            }
        } else {
            // Direct copy if not compressed
            fs::copy(lima_source, &lima_dest)
                .map_err(|e| format!("Failed to copy Lima binary: {}", e))?;
        }

        // Create limactl symlink (Colima expects this)
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Creating limactl symlink...".to_string());
        }

        let limactl_dest = bin_dir.join("limactl");
        if limactl_dest.exists() {
            fs::remove_file(&limactl_dest)
                .map_err(|e| format!("Failed to remove existing limactl: {}", e))?;
        }

        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(&lima_dest, &limactl_dest)
                .map_err(|e| format!("Failed to create limactl symlink: {}", e))?;
        }

        #[cfg(windows)]
        {
            // On Windows, create a copy instead of symlink
            fs::copy(&lima_dest, &limactl_dest)
                .map_err(|e| format!("Failed to create limactl copy: {}", e))?;
        }

        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Setting executable permissions...".to_string());
        }

        // Set executable permissions
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            // Set permissions for Colima
            let mut perms = fs::metadata(&colima_dest)
                .map_err(|e| format!("Failed to get colima binary metadata: {}", e))?
                .permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&colima_dest, perms)
                .map_err(|e| format!("Failed to set colima binary permissions: {}", e))?;

            // Set permissions for Lima
            let mut perms = fs::metadata(&lima_dest)
                .map_err(|e| format!("Failed to get lima binary metadata: {}", e))?
                .permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&lima_dest, perms)
                .map_err(|e| format!("Failed to set lima binary permissions: {}", e))?;
        }

        // Add bin directory to PATH if not already there
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Updating PATH configuration...".to_string());
        }

        // Check if the bin directory is in PATH
        let path_var = std::env::var("PATH").unwrap_or_default();
        let bin_dir_str = bin_dir.to_string_lossy();

        if !path_var.contains(&bin_dir_str.as_ref()) {
            // Add to shell profile files
            let profile_files = vec![
                home_dir.join(".zshrc"),
                home_dir.join(".bash_profile"),
                home_dir.join(".bashrc"),
            ];

            for profile_file in profile_files {
                if profile_file.exists() {
                    let mut content = fs::read_to_string(&profile_file)
                        .unwrap_or_default();

                    let path_export = format!("\n# Add Colima binaries to PATH\nexport PATH=\"$PATH:{}\"\n", bin_dir_str);

                    if !content.contains(&bin_dir_str.as_ref()) {
                        content.push_str(&path_export);
                        fs::write(&profile_file, content)
                            .map_err(|e| format!("Failed to update {}: {}", profile_file.display(), e))?;

                        {
                            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
                            logs.push(format!("Updated PATH in {}", profile_file.display()));
                        }
                        break;
                    }
                }
            }
        }

        // Clean up temporary files
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Cleaning up download files...".to_string());
        }

        // Remove downloaded files and download directory
        if let Err(e) = fs::remove_file(&download_result.colima_path) {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Warning: Failed to remove temporary colima file: {}", e));
        }

        if let Err(e) = fs::remove_file(&download_result.lima_path) {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Warning: Failed to remove temporary lima file: {}", e));
        }

        // Try to remove the download directory if it's empty
        let download_dir = Path::new(&download_result.colima_path).parent().unwrap_or_else(|| Path::new(""));
        if let Err(e) = fs::remove_dir(download_dir) {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Info: Download directory cleanup: {}", e));
        }

        // Verify the installation
        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Verifying installation...".to_string());
        }

        Self::verify_installed_binaries(&bin_dir)?;

        {
            let mut logs = BINARY_INSTALLATION_LOGS.lock().unwrap();
            logs.push("✅ Binary installation completed successfully".to_string());
            logs.push(format!("Colima installed to: {}", colima_dest.display()));
            logs.push(format!("Lima installed to: {}", lima_dest.display()));
            logs.push(format!("limactl symlink created at: {}", limactl_dest.display()));
            logs.push("Please restart your terminal or run 'source ~/.zshrc' to update PATH".to_string());
        }

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn get_colima_versions() -> Result<VersionInfo, String> {
        // Try multiple paths to find the version configuration
        let possible_paths = vec![
            // Development path (relative to current working directory)
            std::env::current_dir()
                .map(|p| p.join("src-tauri").join("config").join("colima_versions.json"))
                .unwrap_or_default(),
            // Executable directory path
            std::env::current_exe()
                .map(|p| p.parent().unwrap_or(&p).join("config").join("colima_versions.json"))
                .unwrap_or_default(),
            // App data directory path
            dirs::config_dir()
                .map(|p| p.join("nookat").join("colima_versions.json"))
                .unwrap_or_default(),
        ];

        for config_path in possible_paths {
            tracing::debug!("Checking config path: {:?}", config_path);
            if config_path.exists() {
                tracing::info!("Found config file at: {:?}", config_path);
                match fs::read_to_string(&config_path) {
                    Ok(config_content) => {
                        match serde_json::from_str::<VersionInfo>(&config_content) {
                            Ok(version_info) => {
                                tracing::info!("Successfully loaded version config from: {:?}", config_path);
                                return Ok(version_info);
                            }
                            Err(e) => {
                                tracing::warn!("Failed to parse version config from {:?}: {}", config_path, e);
                                continue;
                            }
                        }
                    }
                    Err(e) => {
                        tracing::warn!("Failed to read version config from {:?}: {}", config_path, e);
                        continue;
                    }
                }
            } else {
                tracing::debug!("Config path does not exist: {:?}", config_path);
            }
        }

        // If no config file found, use the built-in default configuration
        tracing::warn!("No version config file found, using built-in default configuration");
        tracing::info!("Using built-in version config: Colima v0.6.3, Lima v0.23.0");

        serde_json::from_str(DEFAULT_VERSION_CONFIG)
            .map_err(|e| format!("Failed to parse built-in default config: {}", e))
    }

    // NEW: Helper function to check download status
    fn check_download_status(download_result: &DownloadResult) -> Result<(), String> {
        let colima_path = Path::new(&download_result.colima_path);
        let lima_path = Path::new(&download_result.lima_path);

        if !colima_path.exists() {
            return Err(format!("Colima file not found at: {}", colima_path.display()));
        }

        if !lima_path.exists() {
            return Err(format!("Lima file not found at: {}", lima_path.display()));
        }

        let colima_size = fs::metadata(colima_path)
            .map(|m| m.len())
            .unwrap_or(0);

        let lima_size = fs::metadata(lima_path)
            .map(|m| m.len())
            .unwrap_or(0);

        if colima_size == 0 {
            return Err("Colima file is empty".to_string());
        }

        if lima_size == 0 {
            return Err("Lima file is empty".to_string());
        }

        Ok(())
    }

    // NEW: Helper function to verify installed binaries
    fn verify_installed_binaries(bin_dir: &Path) -> Result<(), String> {
        let colima_path = bin_dir.join("colima");
        let lima_path = bin_dir.join("lima");
        let limactl_path = bin_dir.join("limactl");

        // Check if binaries exist
        if !colima_path.exists() {
            return Err(format!("Colima binary not found at: {}", colima_path.display()));
        }

        if !lima_path.exists() {
            return Err(format!("Lima binary not found at: {}", lima_path.display()));
        }

        if !limactl_path.exists() {
            return Err(format!("limactl symlink not found at: {}", limactl_path.display()));
        }

        // Check if binaries are executable
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            let colima_perms = fs::metadata(&colima_path)
                .map_err(|e| format!("Failed to get colima permissions: {}", e))?
                .permissions();

            let lima_perms = fs::metadata(&lima_path)
                .map_err(|e| format!("Failed to get lima permissions: {}", e))?
                .permissions();

            let limactl_perms = fs::metadata(&limactl_path)
                .map_err(|e| format!("Failed to get limactl permissions: {}", e))?
                .permissions();

            if colima_perms.mode() & 0o111 == 0 {
                return Err("Colima binary is not executable".to_string());
            }

            if lima_perms.mode() & 0o111 == 0 {
                return Err("Lima binary is not executable".to_string());
            }

            if limactl_perms.mode() & 0o111 == 0 {
                return Err("limactl symlink is not executable".to_string());
            }
        }

        Ok(())
    }

    // NEW: Validation function for PHASE-004
    #[instrument(skip_all, err)]
    pub async fn validate_colima_installation() -> Result<ValidationResult, String> {
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

    // NEW: Get Docker context information
    #[instrument(skip_all, err)]
    pub async fn get_docker_context_info() -> Result<ContextInfo, String> {
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

    // NEW: Save engine configuration
    #[instrument(skip_all, err)]
    pub async fn save_engine_config(config: EngineConfig) -> Result<(), String> {
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

    // NEW: Basic repair guidance
    #[instrument(skip_all, err)]
    pub async fn repair_colima_installation() -> Result<RepairResult, String> {
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
}
