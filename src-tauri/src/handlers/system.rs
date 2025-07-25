use std::process::Command;

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    // Open URL using the system's default browser
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&url)
            .output()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&url)
            .output()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/C", "start", &url])
            .output()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }
    
    Ok(())
} 