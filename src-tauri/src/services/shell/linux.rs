use super::{
    docker_exec_args, endpoints_with_the_current_context_first, DOCKER_CONTEXT_LIST_FORMAT,
};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tracing::{debug, info, instrument, warn};

const TERMINALS_WITH_EXEC_FLAG: [(&str, &str); 5] = [
    ("gnome-terminal", "--"),
    ("konsole", "-e"),
    ("xterm", "-e"),
    ("alacritty", "-e"),
    ("kitty", "-e"),
];

async fn try_open_terminal(app: &AppHandle, terminal: &str, args: &[&str]) -> bool {
    debug!("Trying terminal: {} with args: {:?}", terminal, args);

    if !matches!(is_command_available(app, terminal).await, Ok(true)) {
        debug!("Terminal {} is not available", terminal);
        return false;
    }

    debug!("Terminal {} is available, attempting to open", terminal);
    match app.shell().command(terminal).args(args).spawn() {
        Ok(_) => {
            info!("Successfully opened terminal {} for container", terminal);
            true
        }
        Err(e) => {
            warn!("Failed to open terminal {}: {}", terminal, e);
            false
        }
    }
}

#[instrument(skip_all, err)]
pub async fn open_container_terminal(
    app: &AppHandle,
    endpoint: &str,
    container_id: &str,
    shell: &str,
) -> Result<(), String> {
    for (terminal, exec_flag) in TERMINALS_WITH_EXEC_FLAG {
        let args: Vec<&str> = [exec_flag, "docker"]
            .into_iter()
            .chain(docker_exec_args(endpoint, container_id, shell))
            .collect();
        if try_open_terminal(app, terminal, &args).await {
            return Ok(());
        }
    }

    Err("No suitable terminal found. Please install a terminal emulator like gnome-terminal, konsole, xterm, alacritty, or kitty".to_string())
}

#[instrument(skip_all, err)]
async fn is_command_available(app: &AppHandle, command: &str) -> Result<bool, String> {
    let output = app
        .shell()
        .command("which")
        .args([command])
        .output()
        .await
        .map_err(|e| format!("Failed to check {} availability: {}", command, e))?;

    Ok(output.status.success())
}

#[instrument(skip_all, err)]
pub async fn is_docker_command_available(app: &AppHandle) -> Result<bool, String> {
    debug!("Checking if Docker command is available");

    fn is_docker_installed(output_str: &str) -> bool {
        output_str.to_lowercase().contains("version")
    }

    let output = app
        .shell()
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

#[instrument(skip_all, err)]
pub async fn is_homebrew_available(_app: &AppHandle) -> Result<bool, String> {
    Ok(false)
}

#[instrument(skip_all, err)]
pub async fn is_colima_available(_app: &AppHandle) -> Result<bool, String> {
    Ok(false)
}

#[instrument(skip_all, err)]
pub async fn get_docker_context_endpoints(app: &AppHandle) -> Result<Vec<String>, String> {
    let context_output = app
        .shell()
        .command("docker")
        .args(["context", "ls", "--format", DOCKER_CONTEXT_LIST_FORMAT])
        .output()
        .await
        .map_err(|e| format!("Failed to get Docker contexts: {}", e))?;

    if !context_output.status.success() {
        let error = String::from_utf8_lossy(&context_output.stderr);
        return Err(format!("Failed to list Docker contexts: {}", error));
    }

    Ok(endpoints_with_the_current_context_first(
        &String::from_utf8_lossy(&context_output.stdout),
    ))
}
