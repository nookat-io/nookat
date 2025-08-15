use crate::entities::{VersionInfo, DownloadResult};
use std::process::Command;
use std::sync::Mutex;
use tracing::instrument;
use std::path::Path;
use std::fs;
use reqwest::Client;
use std::time::Instant;
use flate2::read::GzDecoder;
use tar::Archive;
use serde::{Serialize, Deserialize};

// Lima installation status struct
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LimaInstallationStatus {
    pub lima_installed: bool,
    pub limactl_installed: bool,
    pub lima_executable: bool,
    pub limactl_executable: bool,
    pub fully_working: bool,
}

// Lima version configuration
const LIMA_VERSION_CONFIG: &str = r#"{
  "lima_version": "1.2.1",
  "lima_checksum": "4c6e20510b456a4e380500096ecce72c18d0ce98548064dc8089797de2290fdc",
  "download_url": "https://github.com/lima-vm/lima/releases/download/v1.2.1/lima-1.2.1-Darwin-arm64.tar.gz"
}"#;

#[derive(Default, Debug)]
pub struct LimaService {}

// Global state for Lima installation logs
static LIMA_INSTALLATION_LOGS: Mutex<Vec<String>> = Mutex::new(Vec::new());

impl LimaService {
    pub fn new() -> Self {
        Self::default()
    }

    /// Get Lima version information
    #[instrument(skip_all, err)]
    pub async fn get_lima_version() -> Result<VersionInfo, String> {
        serde_json::from_str(LIMA_VERSION_CONFIG)
            .map_err(|e| format!("Failed to parse Lima version config: {}", e))
    }

    /// Download Lima binary
    #[instrument(skip_all, err)]
    pub async fn download_lima_binary() -> Result<DownloadResult, String> {
        // Clear previous logs
        {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.clear();
            logs.push("Starting Lima download process...".to_string());
        }

        let start_time = Instant::now();
        let version_info = Self::get_lima_version().await?;

        // Create download directory
        {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Creating download directory...".to_string());
        }

        let home_dir = dirs::home_dir()
            .ok_or("Failed to determine home directory")?;
        let download_dir = home_dir.join(".nookat").join("downloads");
        fs::create_dir_all(&download_dir)
            .map_err(|e| format!("Failed to create download directory: {}", e))?;

        // Download Lima binary
        {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Downloading Lima v{}...", version_info.lima_version));
        }

        let lima_path = Self::download_binary(
            &version_info.download_urls.lima,
            &download_dir.join("lima.tar.gz"),
            "lima"
        ).await?;

        let download_time = start_time.elapsed();
        let download_size = fs::metadata(&lima_path)
            .map(|m| m.len())
            .unwrap_or(0);

        {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Lima download completed in {:.2?}. Size: {} bytes", download_time, download_size));
        }

        Ok(DownloadResult {
            colima_path: String::new(), // Not used for Lima-only download
            lima_path: lima_path.to_string_lossy().to_string(),
            download_size,
            download_time,
        })
    }

    /// Install Lima binary
    #[instrument(skip_all, err)]
    pub async fn install_lima_binary() -> Result<(), String> {
        {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Starting Lima installation...".to_string());
        }

        // Download Lima if not already downloaded
        let download_result = Self::download_lima_binary().await?;

        {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Lima downloaded, proceeding with installation...".to_string());
        }

        // Verify download
        Self::verify_lima_download(&download_result)?;

        // Determine installation paths
        let home_dir = dirs::home_dir()
            .ok_or("Failed to determine home directory")?;
        let bin_dir = home_dir.join(".local").join("bin");

        {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Creating installation directories...".to_string());
        }

        // Create necessary directories
        fs::create_dir_all(&bin_dir)
            .map_err(|e| format!("Failed to create bin directory: {}", e))?;

        // Install Lima binary
        {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Installing Lima binary...".to_string());
        }

        let lima_source = Path::new(&download_result.lima_path);
        let lima_dest = bin_dir.join("lima");

        // Verify source file exists
        if !lima_source.exists() {
            return Err(format!("Lima source file does not exist: {}", lima_source.display()));
        }

        // Extract Lima from tar.gz
        Self::extract_lima_binary(lima_source, &lima_dest).await?;

        // Create limactl symlink
        {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
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
            fs::copy(&lima_dest, &limactl_dest)
                .map_err(|e| format!("Failed to create limactl copy: {}", e))?;
        }

        // Set executable permissions
        {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push("Setting executable permissions...".to_string());
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            let mut perms = fs::metadata(&lima_dest)
                .map_err(|e| format!("Failed to get lima binary metadata: {}", e))?
                .permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&lima_dest, perms)
                .map_err(|e| format!("Failed to set lima binary permissions: {}", e))?;
        }

        // Update PATH
        Self::update_path_configuration(&bin_dir, &home_dir)?;

        // Clean up
        Self::cleanup_download_files(&download_result)?;

        // Verify installation
        Self::verify_lima_installation(&bin_dir)?;

        {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push("✅ Lima installation completed successfully".to_string());
            logs.push(format!("Lima installed to: {}", lima_dest.display()));
            logs.push(format!("limactl symlink created at: {}", limactl_dest.display()));
        }

        Ok(())
    }

    /// Get Lima installation logs
    pub async fn get_installation_logs() -> Result<Vec<String>, String> {
        let logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
        Ok(logs.clone())
    }

    /// Clear Lima installation logs
    pub async fn clear_installation_logs() -> Result<(), String> {
        let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
        logs.clear();
        Ok(())
    }

    /// Check if Lima is installed and working
    pub async fn check_lima_status() -> Result<bool, String> {
        let lima_check = Command::new("which").arg("lima").output();
        let limactl_check = Command::new("which").arg("limactl").output();

        let lima_installed = lima_check.map(|output| output.status.success()).unwrap_or(false);
        let limactl_installed = limactl_check.map(|output| output.status.success()).unwrap_or(false);

        Ok(lima_installed && limactl_installed)
    }

    /// Get detailed Lima installation status
    pub async fn get_lima_installation_status() -> Result<LimaInstallationStatus, String> {
        let lima_check = Command::new("which").arg("lima").output();
        let limactl_check = Command::new("which").arg("limactl").output();

        let lima_installed = lima_check.map(|output| output.status.success()).unwrap_or(false);
        let limactl_installed = limactl_check.map(|output| output.status.success()).unwrap_or(false);

        // Check if binaries are executable
        let lima_executable = if lima_installed {
            let lima_path = Command::new("which").arg("lima").output()
                .ok()
                .and_then(|output| String::from_utf8(output.stdout).ok())
                .map(|s| s.trim().to_string());

            if let Some(path) = lima_path {
                Command::new(&path).arg("--version").output()
                    .map(|output| output.status.success())
                    .unwrap_or(false)
            } else {
                false
            }
        } else {
            false
        };

        let limactl_executable = if limactl_installed {
            let limactl_path = Command::new("which").arg("limactl").output()
                .ok()
                .and_then(|output| String::from_utf8(output.stdout).ok())
                .map(|s| s.trim().to_string());

            if let Some(path) = limactl_path {
                Command::new(&path).arg("--version").output()
                    .map(|output| output.status.success())
                    .unwrap_or(false)
            } else {
                false
            }
        } else {
            false
        };

        Ok(LimaInstallationStatus {
            lima_installed,
            limactl_installed,
            lima_executable,
            limactl_executable,
            fully_working: lima_installed && limactl_installed && lima_executable && limactl_executable,
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

    fn verify_lima_download(download_result: &DownloadResult) -> Result<(), String> {
        let lima_path = Path::new(&download_result.lima_path);

        if !lima_path.exists() {
            return Err(format!("Lima file not found at: {}", lima_path.display()));
        }

        let lima_size = fs::metadata(lima_path)
            .map(|m| m.len())
            .unwrap_or(0);

        if lima_size == 0 {
            return Err("Lima file is empty".to_string());
        }

        Ok(())
    }

    async fn extract_lima_binary(lima_source: &Path, lima_dest: &Path) -> Result<(), String> {
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
                        let mut file = fs::File::create(lima_dest)
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
            fs::copy(lima_source, lima_dest)
                .map_err(|e| format!("Failed to copy Lima binary: {}", e))?;
        }

        Ok(())
    }

    fn update_path_configuration(bin_dir: &Path, home_dir: &Path) -> Result<(), String> {
        let path_var = std::env::var("PATH").unwrap_or_default();
        let bin_dir_str = bin_dir.to_string_lossy();

        if !path_var.contains(&bin_dir_str.as_ref()) {
            let profile_files = vec![
                home_dir.join(".zshrc"),
                home_dir.join(".bash_profile"),
                home_dir.join(".bashrc"),
            ];

            for profile_file in profile_files {
                if profile_file.exists() {
                    let mut content = fs::read_to_string(&profile_file)
                        .unwrap_or_default();

                    let path_export = format!("\n# Add Lima binaries to PATH\nexport PATH=\"$PATH:{}\"\n", bin_dir_str);

                    if !content.contains(&bin_dir_str.as_ref()) {
                        content.push_str(&path_export);
                        fs::write(&profile_file, content)
                            .map_err(|e| format!("Failed to update {}: {}", profile_file.display(), e))?;

                        {
                            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
                            logs.push(format!("Updated PATH in {}", profile_file.display()));
                        }
                        break;
                    }
                }
            }
        }

        Ok(())
    }

    fn cleanup_download_files(download_result: &DownloadResult) -> Result<(), String> {
        if let Err(e) = fs::remove_file(&download_result.lima_path) {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Warning: Failed to remove temporary lima file: {}", e));
        }

        let download_dir = Path::new(&download_result.lima_path).parent().unwrap_or_else(|| Path::new(""));
        if let Err(e) = fs::remove_dir(download_dir) {
            let mut logs = LIMA_INSTALLATION_LOGS.lock().unwrap();
            logs.push(format!("Info: Download directory cleanup: {}", e));
        }

        Ok(())
    }

    fn verify_lima_installation(bin_dir: &Path) -> Result<(), String> {
        let lima_path = bin_dir.join("lima");
        let limactl_path = bin_dir.join("limactl");

        if !lima_path.exists() {
            return Err(format!("Lima binary not found at: {}", lima_path.display()));
        }

        if !limactl_path.exists() {
            return Err(format!("limactl symlink not found at: {}", limactl_path.display()));
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;

            let lima_perms = fs::metadata(&lima_path)
                .map_err(|e| format!("Failed to get lima permissions: {}", e))?
                .permissions();

            if lima_perms.mode() & 0o111 == 0 {
                return Err("Lima binary is not executable".to_string());
            }
        }

        Ok(())
    }
}
