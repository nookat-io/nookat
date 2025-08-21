#![allow(unused)]

use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tracing::{debug, info, warn, instrument};

/// Try to execute terminal commands and return true if any succeed
async fn try_terminal_commands(app: &AppHandle, terminal_configs: &[(&str, &[&str])]) -> bool {
    for (terminal, args) in terminal_configs {
        debug!("Trying terminal: {} with args: {:?}", terminal, args);

        // Check if terminal is available
        if let Ok(true) = is_command_available(app, terminal).await {
            debug!("Terminal {} is available, attempting to open", terminal);

            // Try to open the terminal
            match app.shell().command(terminal).args(*args).spawn() {
                Ok(_) => {
                    info!("Successfully opened terminal {} for container", terminal);
                    return true;
                }
                Err(e) => {
                    warn!("Failed to open terminal {}: {}", terminal, e);
                    continue;
                }
            }
        } else {
            debug!("Terminal {} is not available", terminal);
        }
    }

    false
}

#[instrument(skip_all, err)]
/// Opens a terminal with docker exec command for the given container
pub async fn open_container_terminal(app: &AppHandle, container_id: &str) -> Result<(), String> {
    let terminal_configs: &[(&str, &[&str])] = &[
        ("gnome-terminal", &["--", "docker", "exec", "-it", container_id, "bash"]),
        ("konsole", &["-e", "docker", "exec", "-it", container_id, "bash"]),
        ("xterm", &["-e", "docker", "exec", "-it", container_id, "bash"]),
        ("alacritty", &["-e", "docker", "exec", "-it", container_id, "bash"]),
        ("kitty", &["-e", "docker", "exec", "-it", container_id, "bash"]),
    ];

    // Try with bash first
    if try_terminal_commands(app, terminal_configs).await {
        return Ok(());
    }

    // Fall back to sh if bash fails
    let terminal_configs_sh: &[(&str, &[&str])] = &[
        ("gnome-terminal", &["--", "docker", "exec", "-it", container_id, "sh"]),
        ("konsole", &["-e", "docker", "exec", "-it", container_id, "sh"]),
        ("xterm", &["-e", "docker", "exec", "-it", container_id, "sh"]),
        ("alacritty", &["-e", "docker", "exec", "-it", container_id, "sh"]),
        ("kitty", &["-e", "docker", "exec", "-it", container_id, "sh"]),
    ];

    if try_terminal_commands(app, terminal_configs_sh).await {
        return Ok(());
    }

    Err("No suitable terminal found. Please install a terminal emulator like gnome-terminal, konsole, xterm, alacritty, or kitty".to_string())
}

// Command availability checks
/// Check if a command is available in PATH
#[instrument(skip_all, err)]
pub async fn is_command_available(app: &AppHandle, command: &str) -> Result<bool, String> {
    let output = app.shell()
        .command("which")
        .args([command])
        .output()
        .await
        .map_err(|e| format!("Failed to check {} availability: {}", command, e))?;

    Ok(output.status.success())
}

/// Check if a command is working by running it with --version
#[instrument(skip_all, err)]
pub async fn is_command_working(app: &AppHandle, command: &str) -> Result<bool, String> {
    let output = app.shell()
        .command(command)
        .args(["--version"])
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
#[instrument(skip_all, err)]
pub async fn is_homebrew_available(_app: &AppHandle) -> Result<bool, String> {
    // Homebrew is not available on Linux, it's only available on macOS
    Ok(false)
}

/// Check if Colima is available and working
#[instrument(skip_all, err)]
pub async fn is_colima_available(_app: &AppHandle) -> Result<bool, String> {
    // Not implemented for Linux yet
    Ok(false)
}

// Package management
/// Install packages via Homebrew
#[instrument(skip_all, err)]
pub async fn install_packages_via_homebrew(_app: &AppHandle, _packages: &[&str]) -> Result<(), String> {
    Err("Homebrew is not available on Linux".to_string())
}

// Docker context operations
/// Get Docker context endpoints
#[instrument(skip_all, err)]
pub async fn get_docker_context_endpoints(app: &AppHandle) -> Result<Vec<String>, String> {
    let context_output = app.shell()
        .command("docker")
        .args(["context", "ls", "--format", "{{.DockerEndpoint}}"])
        .output()
        .await
        .map_err(|e| format!("Failed to get Docker contexts: {}", e))?;

    if !context_output.status.success() {
        let error = String::from_utf8_lossy(&context_output.stderr);
        return Err(format!("Failed to list Docker contexts: {}", error));
    }

    let output_str = String::from_utf8_lossy(&context_output.stdout).trim().to_string();
    Ok(output_str.lines().map(|s| s.to_string()).filter(|s| !s.is_empty()).collect())
}

// Colima operations
/// Check Colima VM status
#[instrument(skip_all, err)]
pub async fn check_colima_status(app: &AppHandle) -> Result<bool, String> {
    // Not implemented for Linux yet
    Ok(false)
}

/// Start Colima VM with configuration
#[instrument(skip_all, err)]
pub async fn start_colima_with_config(
    _app: &AppHandle,
    _config: &crate::entities::ColimaConfig,
) -> Result<(), String> {
    // Not implemented for Linux yet
    Err("Colima is not available on Linux".to_string())
}

/// Validate Colima startup by checking Docker connectivity
#[instrument(skip_all, err)]
pub async fn validate_colima_startup(app: &AppHandle) -> Result<(), String> {
    // Not implemented for Linux yet
    Err("Colima is not available on Linux".to_string())
}
