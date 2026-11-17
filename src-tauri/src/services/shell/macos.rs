use crate::entities::ColimaConfig;
use tauri::AppHandle;
use tauri_plugin_shell::process::Output;
use tauri_plugin_shell::ShellExt;
use tracing::{debug, instrument};

async fn run_in_login_shell(
    app: &AppHandle,
    command: &str,
) -> Result<Output, tauri_plugin_shell::Error> {
    app.shell()
        .command("zsh")
        .args(["-l", "-c", command])
        .output()
        .await
}

fn stdout_and_stderr(output: &Output) -> String {
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

#[instrument(skip_all, err)]
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

#[instrument(skip_all, err)]
async fn is_command_available(app: &AppHandle, command: &str) -> Result<bool, String> {
    let output = run_in_login_shell(app, &format!("which {}", command))
        .await
        .map_err(|e| format!("Failed to check {} availability: {}", command, e))?;

    Ok(output.status.success())
}

#[instrument(skip_all, err)]
async fn command_version(app: &AppHandle, command: &str) -> Result<Option<String>, String> {
    let output = run_in_login_shell(app, &format!("{} --version", command))
        .await
        .map_err(|e| format!("Failed to check {} version: {}", command, e))?;

    if !output.status.success() {
        return Ok(None);
    }

    Ok(Some(
        String::from_utf8_lossy(&output.stdout).trim().to_string(),
    ))
}

#[instrument(skip_all, err)]
pub async fn is_docker_command_available(app: &AppHandle) -> Result<bool, String> {
    debug!("Checking if Docker command is available");

    fn is_docker_installed(output_str: &str) -> bool {
        output_str.to_lowercase().contains("version")
    }

    let output = run_in_login_shell(app, "docker --version")
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

#[instrument(skip_all, err)]
pub async fn is_homebrew_available(app: &AppHandle) -> Result<bool, String> {
    if !is_command_available(app, "brew").await? {
        return Ok(false);
    }

    Ok(command_version(app, "brew").await?.is_some())
}

#[instrument(skip_all, err)]
pub async fn is_colima_available(app: &AppHandle) -> Result<bool, String> {
    debug!("Checking if Colima is available on the system");

    if !is_command_available(app, "colima").await? {
        debug!("Colima command not found in PATH");
        return Ok(false);
    }

    let Some(version) = command_version(app, "colima").await? else {
        debug!("Colima command exists but failed to execute");
        return Ok(false);
    };

    debug!("Colima is available, version: {}", version);
    Ok(true)
}

#[instrument(skip_all, err)]
pub async fn install_packages_via_homebrew(
    app: &AppHandle,
    packages: &[&str],
) -> Result<(), String> {
    debug!("Installing packages via Homebrew: {:?}", packages);

    for package in packages {
        debug!("Installing package: {}", package);

        let output = run_in_login_shell(app, &format!("brew install {}", package))
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

#[instrument(skip_all, err)]
pub async fn get_docker_context_endpoints(app: &AppHandle) -> Result<Vec<String>, String> {
    let context_output =
        run_in_login_shell(app, "docker context ls --format '{{.DockerEndpoint}}'")
            .await
            .map_err(|e| format!("Failed to get Docker contexts: {}", e))?;

    if !context_output.status.success() {
        return Err("Failed to list Docker contexts".to_string());
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

#[instrument(skip_all, err)]
pub async fn check_colima_status(app: &AppHandle) -> Result<bool, String> {
    let output = run_in_login_shell(app, "colima status")
        .await
        .map_err(|e| format!("Failed to check Colima status: {}", e))?;

    if !output.status.success() {
        return Ok(false);
    }

    let colima_log_output = stdout_and_stderr(&output).to_lowercase();
    Ok(!colima_log_output.contains("is not running"))
}

#[instrument(skip_all, err)]
pub async fn stop_colima(app: &AppHandle) -> Result<(), String> {
    debug!("Stopping Colima");
    debug!("Executing: colima stop");

    let output = run_in_login_shell(app, "colima stop")
        .await
        .map_err(|e| format!("Failed to stop Colima: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to stop Colima: {}", stderr));
    }

    debug!("Colima stopped successfully");
    Ok(())
}

#[instrument(skip_all, err)]
pub async fn start_colima_with_config(
    app: &AppHandle,
    config: &ColimaConfig,
) -> Result<(), String> {
    debug!("Starting Colima with config: {:?}", config);

    let command = format!(
        "colima start --cpu {} --memory {} --disk {} --arch {}",
        config.cpu, config.memory, config.disk, config.architecture
    );
    debug!("Executing: {}", command);

    let output = run_in_login_shell(app, &command)
        .await
        .map_err(|e| format!("Failed to start Colima: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to start Colima: {}", stderr));
    }

    debug!("Colima started successfully");
    Ok(())
}

#[instrument(skip_all, err)]
pub async fn validate_colima_startup(app: &AppHandle) -> Result<(), String> {
    debug!("Validating Colima startup");

    let docker_check = run_in_login_shell(app, "docker version")
        .await
        .map_err(|e| format!("Docker command failed: {}", e))?;

    if !docker_check.status.success() {
        return Err("Docker is not responding after Colima startup".to_string());
    }

    let info_check = run_in_login_shell(app, "docker info")
        .await
        .map_err(|e| format!("Docker info command failed: {}", e))?;

    if !info_check.status.success() {
        return Err("Cannot connect to Docker daemon".to_string());
    }

    debug!("Colima startup validation successful");
    Ok(())
}
