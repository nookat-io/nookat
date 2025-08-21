use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tracing::{debug, instrument};

#[instrument(skip_all, err)]
/// Opens a terminal with docker exec command for the given container
pub async fn open_container_terminal(app: &AppHandle, container_id: &str) -> Result<(), String> {
    let shell_commands = ["bash", "sh"];

    for shell in shell_commands.iter() {
        let status = app
            .shell()
            .command("osascript")
            .args([
                "-e",
                &format!(
                    "tell application \"Terminal\" to do script \"docker exec -it {} {}\"",
                    container_id, shell
                ),
            ])
            .status()
            .await;

        if let Ok(status) = status {
            if status.success() {
                return Ok(());
            }
        }
    }

    Err("Failed to open terminal on macOS".to_string())
}

/// Check if a command is available in PATH
#[instrument(skip_all, err)]
async fn is_command_available(app: &AppHandle, command: &str) -> Result<bool, String> {
    let output = app.shell()
        .command("zsh")
        .args(["-l", "-c", &format!("which {}", command)])
        .output()
        .await
        .map_err(|e| format!("Failed to check {} availability: {}", command, e))?;

    Ok(output.status.success())
}

/// Check if a command is working by running it with --version
#[instrument(skip_all, err)]
async fn is_command_working(app: &AppHandle, command: &str) -> Result<bool, String> {
    let output = app.shell()
        .command("zsh")
        .args(["-l", "-c", &format!("{} --version", command)])
        .output()
        .await
        .map_err(|e| format!("Failed to check {} version: {}", command, e))?;

    Ok(output.status.success())
}

/// Check if Docker command is available and working
#[instrument(skip_all, err)]
pub async fn is_docker_command_available(app: &AppHandle) -> Result<bool, String> {
    debug!("Checking if Docker command is available");

    fn is_docker_installed(output_str: &str) -> bool {
        output_str.to_lowercase().contains("version")
    }

    let output = app.shell()
        .command("zsh")
        .args(["-l", "-c", "docker --version"])
        .output()
        .await
        .map_err(|e| format!("Failed to execute docker command: {}", e))?;

    if !output.status.success() {
        debug!(
            "Docker command is not available, output: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        return Ok(false);
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    debug!("Docker command is available, output: {}", output_str);
    let result = is_docker_installed(&output_str);
    debug!("Docker command is available, result: {}", result);
    Ok(result)
}

/// Check if Homebrew is available and working
#[instrument(skip_all, err)]
pub async fn is_homebrew_available(app: &AppHandle) -> Result<bool, String> {
    if !is_command_available(app, "brew").await? {
        return Ok(false);
    }

    is_command_working(app, "brew").await
}

/// Check if Colima is available and working
#[instrument(skip_all, err)]
pub async fn is_colima_available(app: &AppHandle) -> Result<bool, String> {
    debug!("Checking if Colima is available on the system");

    if !is_command_available(app, "colima").await? {
        debug!("Colima command not found in PATH");
        return Ok(false);
    }

    if !is_command_working(app, "colima").await? {
        debug!("Colima command exists but failed to execute");
        return Ok(false);
    }

    // Get version for logging
    let version_output = app.shell()
        .command("zsh")
        .args(["-l", "-c", "colima --version"])
        .output()
        .await
        .map_err(|e| format!("Failed to check Colima version: {}", e))?;

    let version = String::from_utf8_lossy(&version_output.stdout)
        .trim()
        .to_string();
    debug!("Colima is available, version: {}", version);
    Ok(true)
}

// Package management
/// Install packages via Homebrew
#[instrument(skip_all, err)]
pub async fn install_packages_via_homebrew(app: &AppHandle, packages: &[&str]) -> Result<(), String> {
    debug!("Installing packages via Homebrew: {:?}", packages);

    for package in packages {
        debug!("Installing package: {}", package);

        let output = app.shell()
            .command("zsh")
            .args(["-l", "-c", &format!("brew install {}", package)])
            .output()
            .await
            .map_err(|e| format!("Failed to execute brew install {}: {}", package, e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to install {}: {}", package, stderr));
        }

        debug!("Successfully installed package: {}", package);
    }

    Ok(())
}

/// Get Docker context endpoints
#[instrument(skip_all, err)]
pub async fn get_docker_context_endpoints(app: &AppHandle) -> Result<Vec<String>, String> {
    let context_output = app.shell()
        .command("zsh")
        .args(["-l", "-c", "docker context ls --format '{{.DockerEndpoint}}'"])
        .output()
        .await
        .map_err(|e| format!("Failed to get Docker contexts: {}", e))?;

    if !context_output.status.success() {
        return Err("Failed to list Docker contexts".to_string());
    }

    let output_str = String::from_utf8_lossy(&context_output.stdout).trim().to_string();
    Ok(output_str.lines().map(|s| s.to_string()).filter(|s| !s.is_empty()).collect())
}

/// Check Colima VM status
#[instrument(skip_all, err)]
pub async fn check_colima_status(app: &AppHandle) -> Result<bool, String> {
    let output = app.shell()
        .command("zsh")
        .args(["-l", "-c", "colima status"])
        .output()
        .await
        .map_err(|e| format!("Failed to check Colima status: {}", e))?;

    if !output.status.success() {
        return Ok(false);
    }

    let status_text = String::from_utf8_lossy(&output.stdout);
    Ok(status_text.contains("Running"))
}

/// Start Colima VM with configuration
#[instrument(skip_all, err)]
pub async fn start_colima_with_config(app: &AppHandle, config: &crate::entities::ColimaConfig) -> Result<(), String> {
    debug!("Starting Colima with config: {:?}", config);

    let mut args = vec!["start"];

    // Add CPU configuration
    let cpu_str = config.cpu.to_string();
    args.extend_from_slice(&["--cpu", &cpu_str]);

    // Add memory configuration
    let memory_str = config.memory.to_string();
    args.extend_from_slice(&["--memory", &memory_str]);

    // Add disk configuration
    let disk_str = config.disk.to_string();
    args.extend_from_slice(&["--disk", &disk_str]);

    // Add architecture configuration
    let architecture_str = config.architecture.to_string();
    args.extend_from_slice(&["--arch", &architecture_str]);

    debug!("Executing: colima {}", args.join(" "));

    let output = app.shell()
        .command("zsh")
        .args(["-l", "-c", &format!("colima {}", args.join(" "))])
        .output()
        .await
        .map_err(|e| format!("Failed to start Colima: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to start Colima: {}", stderr));
    }

    debug!("Colima started successfully");
    Ok(())
}

/// Validate Colima startup by checking Docker connectivity
#[instrument(skip_all, err)]
pub async fn validate_colima_startup(app: &AppHandle) -> Result<(), String> {
    debug!("Validating Colima startup");

    // Check if Docker is responding
    let docker_check = app.shell()
        .command("zsh")
        .args(["-l", "-c", "docker version"])
        .output()
        .await
        .map_err(|e| format!("Docker command failed: {}", e))?;

    if !docker_check.status.success() {
        return Err("Docker is not responding after Colima startup".to_string());
    }

    // Check if we can connect to Docker daemon
    let info_check = app.shell()
        .command("zsh")
        .args(["-l", "-c", "docker info"])
        .output()
        .await
        .map_err(|e| format!("Docker info command failed: {}", e))?;

    if !info_check.status.success() {
        return Err("Cannot connect to Docker daemon".to_string());
    }

    debug!("Colima startup validation successful");
    Ok(())
}
