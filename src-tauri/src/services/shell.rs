#![allow(unused)]

use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tracing::{debug, info, warn};

/// Opens a terminal with docker exec command for the given container
pub async fn open_container_terminal(app: &AppHandle, container_id: &str) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    return open_macos_terminal(app, container_id).await;

    #[cfg(target_os = "linux")]
    return open_linux_terminal(app, container_id).await;

    #[cfg(target_os = "windows")]
    return open_windows_terminal(app, container_id).await;

    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    return Err("Unsupported operating system".to_string());
}

// Command availability checks
/// Check if a command is available in PATH
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
pub async fn is_homebrew_available(app: &AppHandle) -> Result<bool, String> {
    if !is_command_available(app, "brew").await? {
        return Ok(false);
    }

    is_command_working(app, "brew").await
}

/// Check if Colima is available and working
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
        .command("colima")
        .args(["--version"])
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
pub async fn install_packages_via_homebrew(app: &AppHandle, packages: &[&str]) -> Result<(), String> {
    debug!("Installing packages via Homebrew: {:?}", packages);

    for package in packages {
        debug!("Installing package: {}", package);

        let output = app.shell()
            .command("brew")
            .args(["install", package])
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
    let output = app.shell()
        .command("colima")
        .args(["status"])
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
        .command("colima")
        .args(&args)
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
pub async fn validate_colima_startup(app: &AppHandle) -> Result<(), String> {
    debug!("Validating Colima startup");

    // Check if Docker is responding
    let docker_check = app.shell()
        .command("docker")
        .args(["version"])
        .output()
        .await
        .map_err(|e| format!("Docker command failed: {}", e))?;

    if !docker_check.status.success() {
        return Err("Docker is not responding after Colima startup".to_string());
    }

    // Check if we can connect to Docker daemon
    let info_check = app.shell()
        .command("docker")
        .args(["info"])
        .output()
        .await
        .map_err(|e| format!("Docker info command failed: {}", e))?;

    if !info_check.status.success() {
        return Err("Cannot connect to Docker daemon".to_string());
    }

    debug!("Colima startup validation successful");
    Ok(())
}

#[cfg(target_os = "macos")]
async fn open_macos_terminal(app: &AppHandle, container_id: &str) -> Result<(), String> {
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

#[cfg(target_os = "linux")]
async fn open_linux_terminal(app: &AppHandle, container_id: &str) -> Result<(), String> {
    let terminal_configs = [
        ("gnome-terminal", &["--", "docker", "exec", "-it", container_id, "bash"]),
        ("konsole", &["-e", "docker", "exec", "-it", container_id, "bash"]),
        ("xterm", &["-e", "docker", "exec", "-it", container_id, "bash"]),
        ("alacritty", &["-e", "docker", "exec", "-it", container_id, "bash"]),
        ("kitty", &["-e", "docker", "exec", "-it", container_id, "bash"]),
    ];

    // Try with bash first
    if try_terminal_commands(app, &terminal_configs).await {
        return Ok(());
    }

    // Fall back to sh if bash fails
    let terminal_configs_sh = [
        ("gnome-terminal", &["--", "docker", "exec", "-it", container_id, "sh"]),
        ("konsole", &["-e", "docker", "exec", "-it", container_id, "sh"]),
        ("xterm", &["-e", "docker", "exec", "-it", container_id, "sh"]),
        ("alacritty", &["-e", "docker", "exec", "-it", container_id, "sh"]),
        ("kitty", &["-e", "docker", "exec", "-it", container_id, "sh"]),
    ];

    if try_terminal_commands(app, &terminal_configs_sh).await {
        return Ok(());
    }

    Err("No suitable terminal found. Please install a terminal emulator like gnome-terminal, konsole, xterm, alacritty, or kitty".to_string())
}

#[cfg(target_os = "linux")]
async fn try_terminal_commands(
    app: &AppHandle,
    terminal_configs: &[(&str, &[&str])],
) -> bool {
    for (terminal, args) in terminal_configs.iter() {
        if let Ok(status) = app.shell().command(terminal).args(*args).status().await {
            if status.success() {
                return true;
            }
        }
    }
    false
}

#[cfg(target_os = "windows")]
async fn open_windows_terminal(app: &AppHandle, container_id: &str) -> Result<(), String> {
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
