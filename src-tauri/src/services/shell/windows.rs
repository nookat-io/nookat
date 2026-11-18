use super::{endpoints_with_the_current_context_first, DOCKER_CONTEXT_LIST_FORMAT};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use tracing::{debug, instrument};

#[instrument(skip_all, err)]
pub async fn open_container_terminal(
    app: &AppHandle,
    container_id: &str,
    shell: &str,
) -> Result<(), String> {
    debug!("Opening {} in container: {}", shell, container_id);

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
        .await
        .map_err(|e| format!("Failed to open terminal: {}", e))?;

    if !status.success() {
        return Err(format!("The terminal did not start: {:?}", status));
    }

    Ok(())
}

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
