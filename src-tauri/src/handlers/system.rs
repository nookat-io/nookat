use crate::entities::DockerInfo;
use crate::state::SharedDockerState;
use std::process::Command;
use tauri::State;

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    if url.trim().is_empty() {
        return Err("URL cannot be empty".to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let output = Command::new("open")
            .arg(&url)
            .output()
            .map_err(|e| format!("Failed to open URL: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to open URL: {}", stderr));
        }
    }

    #[cfg(target_os = "linux")]
    {
        let output = Command::new("xdg-open")
            .arg(&url)
            .output()
            .map_err(|e| format!("Failed to open URL: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to open URL: {}", stderr));
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Use cmd.exe with /c start to properly invoke the start command
        let output = Command::new("cmd")
            .args(["/c", "start", &url])
            .output()
            .map_err(|e| format!("Failed to open URL: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to open URL: {}", stderr));
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_docker_info(state: State<'_, SharedDockerState>) -> Result<DockerInfo, String> {
    let docker = state.get_docker().await?;

    let info = docker
        .info()
        .await
        .map_err(|e| format!("Failed to get Docker info: {}", e))?;
    let version = docker
        .version()
        .await
        .map_err(|e| format!("Failed to get Docker version: {}", e))?;

    state.return_docker(docker).await;
    Ok(DockerInfo::from((info, version)))
}
