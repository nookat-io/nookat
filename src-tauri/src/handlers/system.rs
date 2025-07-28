use std::process::Command;
use bollard::Docker;
use crate::entities::DockerInfo;

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
pub async fn get_docker_info() -> Result<DockerInfo, String> {
    match Docker::connect_with_local_defaults() {
        Ok(docker) => {
            match tokio::try_join!(docker.info(), docker.version()) {
                Ok((info, version)) => {
                    Ok(DockerInfo::from((info, version)))
                }
                Err(e) => {
                    Err(format!("Docker is running but not responding properly: {}", e))
                }
            }
        }
        Err(e) => {
            Err(format!("Docker is not running: {}", e))
        }
    }
}
