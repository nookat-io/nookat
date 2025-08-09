use crate::entities::{DockerInfo, EngineState, EngineStatus};
use crate::state::SharedDockerState;
use std::process::Command;
use tauri::State;
use tracing::instrument;

#[tauri::command]
#[instrument(skip_all, err)]
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
#[instrument(skip_all, err)]
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

#[tauri::command]
pub async fn engine_status(state: State<'_, SharedDockerState>) -> Result<EngineStatus, String> {
    // Check if Docker is installed
    let docker = match state.get_docker().await {
        Ok(d) => d,
        Err(_) => {
            return Ok(EngineStatus {
                state: EngineState::NotInstalled,
                version: None,
                error: None,
            });
        }
    };

    // Ping daemon, if fails assume it is not running
    let can_ping = docker.ping().await.is_ok();
    if !can_ping {
        return Ok(EngineStatus {
            state: EngineState::NotRunning,
            version: None,
            error: None,
        });
    }

    let version = match docker.version().await {
        Ok(v) => v.version,
        Err(e) => {
            return Ok(EngineStatus {
                state: EngineState::Malfunctioning,
                version: None,
                error: Some(format!("Could not get Docker version: {e}")),
            });
        }
    };

    state.return_docker(docker).await;
    // Installed, running and healthy
    Ok(EngineStatus {
        state: EngineState::Healthy,
        version,
        error: None,
    })
}
