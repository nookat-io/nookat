use std::process::Command;

#[tauri::command]
pub async fn open_url(url: String) -> Result<(), String> {
    // Basic URL validation
    if url.trim().is_empty() {
        return Err("URL cannot be empty".to_string());
    }
    
    // Open URL using the system's default browser
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