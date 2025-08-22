#![cfg(target_os = "windows")]
#![allow(unused)]

use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tracing::{debug, instrument};

/// Opens a terminal with docker exec command for the given container
#[instrument(skip_all, err)]
pub async fn open_container_terminal(app: &AppHandle, container_id: &str) -> Result<(), String> {
    debug!("Opening terminal for container: {}", container_id);
    let shell_commands = ["bash", "sh"];

    for shell in shell_commands.iter() {
        debug!("Trying shell: {}", shell);
        let status = app
            .shell()
            .command("cmd")
            .args([
                "/C",
                "start",
                "",
                "docker",
                "exec",
                "-it",
                container_id,
                shell,
            ])
            .status()
            .await;

        match status {
            Ok(status) if status.success() => {
                debug!("Terminal opened successfully");
                return Ok(());
            }
            Ok(status) => {
                debug!("Terminal failed to open: {:?}", status);
            }
            Err(e) => {
                debug!("Failed to open terminal: {}", e);
                return Err(format!("Failed to open terminal: {}", e));
            }
        }
    }

    Err("Failed to open terminal on Windows".to_string())
}

// Command availability checks
/// Check if a command is available in PATH
#[instrument(skip_all, err)]
pub async fn is_command_available(_app: &AppHandle, _command: &str) -> Result<bool, String> {
    // Not implemented for Windows yet
    Ok(false)
}

/// Check if a command is working by running it with --version
#[instrument(skip_all, err)]
pub async fn is_command_working(_app: &AppHandle, _command: &str) -> Result<bool, String> {
    // Not implemented for Windows yet
    Ok(false)
}

/// Check if Docker command is available and working
#[instrument(skip_all, err)]
pub async fn is_docker_command_available(app: &AppHandle) -> Result<bool, String> {
    debug!("Checking if Docker command is available");

    fn is_docker_installed(output_str: &str) -> bool {
        output_str.to_lowercase().contains("version")
    }

    let output = match app
        .shell()
        .command("docker")
        .args(["--version"])
        .output()
        .await
    {
        Ok(o) => o,
        Err(e) => {
            debug!("Docker not available on Windows: {}", e);
            return Ok(false);
        }
    };

    let output_str = String::from_utf8_lossy(&output.stdout);
    debug!("Docker command is available, output: {}", output_str);
    let result = is_docker_installed(&output_str);
    debug!("Docker command is available, result: {}", result);
    Ok(result)
}

/// Check if Homebrew is available and working
#[instrument(skip_all, err)]
pub async fn is_homebrew_available(_app: &AppHandle) -> Result<bool, String> {
    // Homebrew is not available on Windows, it's only available on macOS
    Ok(false)
}

/// Check if Colima is available and working
#[instrument(skip_all, err)]
pub async fn is_colima_available(_app: &AppHandle) -> Result<bool, String> {
    // Not implemented for Windows yet
    Ok(false)
}

// Package management
/// Install packages via Homebrew
#[instrument(skip_all, err)]
pub async fn install_packages_via_homebrew(
    _app: &AppHandle,
    _packages: &[&str],
) -> Result<(), String> {
    Err("Homebrew is not available on Windows".to_string())
}

// Docker context operations
/// Get Docker context endpoints
#[instrument(skip_all, err)]
pub async fn get_docker_context_endpoints(app: &AppHandle) -> Result<Vec<String>, String> {
    let context_output = app
        .shell()
        .command("docker")
        .args(["context", "ls", "--format", "{{.DockerEndpoint}}"])
        .output()
        .await
        .map_err(|e| format!("Failed to get Docker contexts: {}", e))?;

    if !context_output.status.success() {
        let error = String::from_utf8_lossy(&context_output.stderr);
        return Err(format!("Failed to list Docker contexts: {}", error));
    }

    let output_str = String::from_utf8_lossy(&context_output.stdout)
        .trim()
        .to_string();
    Ok(output_str
        .lines()
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .collect())
}

// Colima operations
/// Check Colima VM status
#[instrument(skip_all, err)]
pub async fn check_colima_status(_app: &AppHandle) -> Result<bool, String> {
    // Not implemented for Windows yet
    Ok(false)
}

/// Start Colima VM with configuration
#[instrument(skip_all, err)]
pub async fn start_colima_with_config(
    _app: &AppHandle,
    _config: &crate::entities::ColimaConfig,
) -> Result<(), String> {
    // Not implemented for Windows yet
    Err("Colima is not available on Windows".to_string())
}

/// Validate Colima startup by checking Docker connectivity
#[instrument(skip_all, err)]
pub async fn validate_colima_startup(_app: &AppHandle) -> Result<(), String> {
    // Not implemented for Windows yet
    Err("Colima is not available on Windows".to_string())
}
