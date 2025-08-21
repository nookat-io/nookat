use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tracing::{debug, info, warn};
use std::env;

/// Opens a terminal with docker exec command for the given container
pub async fn open_container_terminal(app: &AppHandle, container_id: &str) -> Result<(), String> {
    let shell_commands = ["bash", "sh"];

    for shell in shell_commands.iter() {
        let status = app
            .shell()
            .command("cmd")
            .args(["/C", "start", "docker", "exec", "-it", container_id, shell])
            .status()
            .await;

        if let Ok(status) = status {
            if status.success() {
                return Ok(());
            }
        }
    }

    Err("Failed to open terminal on Windows".to_string())
}

// Command availability checks
/// Check if a command is available in PATH
pub async fn is_command_available(app: &AppHandle, command: &str) -> Result<bool, String> {
    // Not implemented for Windows yet
    Ok(false)
}

/// Check if a command is working by running it with --version
pub async fn is_command_working(app: &AppHandle, command: &str) -> Result<bool, String> {
    // Not implemented for Windows yet
    Ok(false)
}

/// Check if Docker command is available and working
pub async fn is_docker_command_available(app: &AppHandle) -> Result<bool, String> {
    debug!("Checking if Docker command is available");

    fn is_docker_installed(output_str: &str) -> bool {
        output_str.to_lowercase().contains("version")
    }

    let output = app.shell()
        .command("docker")
        .args(["--version"])
        .output()
        .await
        .map_err(|e| format!("Failed to check Docker version: {}", e))?;

    let output_str = String::from_utf8_lossy(&output.stdout);
    debug!("Docker command is available, output: {}", output_str);
    let result = is_docker_installed(&output_str);
    debug!("Docker command is available, result: {}", result);
    Ok(result)
}

/// Check if Homebrew is available and working
pub async fn is_homebrew_available(app: &AppHandle) -> Result<bool, String> {
    // Homebrew is not available on Windows, it's only available on macOS
    Ok(false)
}

/// Check if Colima is available and working
pub async fn is_colima_available(app: &AppHandle) -> Result<bool, String> {
    // Not implemented for Windows yet
    Ok(false)
}

// Package management
/// Install packages via Homebrew
pub async fn install_packages_via_homebrew(app: &AppHandle, packages: &[&str]) -> Result<(), String> {
    Err("Homebrew is not available on Windows".to_string())
}

// Docker context operations
/// Get Docker context endpoints
pub async fn get_docker_context_endpoints(app: &AppHandle) -> Result<Vec<String>, String> {
    let context_output = app.shell()
        .command("docker")
        .args(["context", "ls", "--format", "{{.DockerEndpoint}}"])
        .output()
        .await
        .map_err(|e| format!("Failed to get Docker contexts: {}", e))?;

    if !context_output.status.success() {
        return Err("Failed to list Docker contexts".to_string());
    }

    let output_str = String::from_utf8_lossy(&context_output.stdout).trim().to_string();
    let endpoints: Vec<String> = output_str.lines().map(|s| s.to_string()).collect();
    Ok(endpoints)
}

// Colima operations
/// Check Colima VM status
pub async fn check_colima_status(app: &AppHandle) -> Result<bool, String> {
    // Not implemented for Windows yet
    Ok(false)
}

/// Start Colima VM with configuration
pub async fn start_colima_with_config(app: &AppHandle, config: &crate::entities::ColimaConfig) -> Result<(), String> {
    // Not implemented for Windows yet
    Err("Colima is not available on Windows".to_string())
}

/// Validate Colima startup by checking Docker connectivity
pub async fn validate_colima_startup(app: &AppHandle) -> Result<(), String> {
    // Not implemented for Windows yet
    Err("Colima is not available on Windows".to_string())
}
