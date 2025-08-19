use crate::entities::{
    ColimaConfig, InstallationMethod, InstallationProgress,
};
use std::process::Command;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use tracing::{debug, instrument, warn};
use bollard::Docker;

#[instrument(skip_all, err)]
pub async fn is_homebrew_available() -> Result<bool, String> {
    // Check if 'brew' command exists in PATH
    let output = Command::new("which")
        .arg("brew")
        .output()
        .map_err(|e| format!("Failed to check Homebrew availability: {}", e))?;

    if output.status.success() {
        // Additional check: try to run 'brew --version' to ensure it's working
        let version_output = Command::new("brew")
            .arg("--version")
            .output()
            .map_err(|e| format!("Failed to check Homebrew version: {}", e))?;

        Ok(version_output.status.success())
    } else {
        Ok(false)
    }
}

#[instrument(skip_all, err)]
pub async fn is_colima_available() -> Result<bool, String> {
    debug!("Checking if Colima is available on the system");

    // Check if colima command exists in PATH
    let output = Command::new("which")
        .arg("colima")
        .output()
        .map_err(|e| format!("Failed to check Colima availability: {}", e))?;

    if !output.status.success() {
        debug!("Colima command not found in PATH");
        return Ok(false);
    }

    // Additional check: try to run 'colima --version' to ensure it's working
    let version_output = Command::new("colima")
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to check Colima version: {}", e))?;

    if !version_output.status.success() {
        debug!("Colima command exists but failed to execute");
        return Ok(false);
    }

    let version = String::from_utf8_lossy(&version_output.stdout)
        .trim()
        .to_string();
    debug!("Colima is available, version: {}", version);
    Ok(true)
}

#[instrument(skip_all, err)]
pub async fn install_colima(
    app_handle: AppHandle,
    method: InstallationMethod,
) -> Result<(), String> {
    debug!("Starting Colima installation via {:?}", method);

    match method {
        InstallationMethod::Homebrew => install_colima_via_homebrew(app_handle).await,
        InstallationMethod::Binary => Err("Binary installation not yet implemented".to_string()),
    }
}

#[instrument(skip_all, err)]
async fn install_colima_via_homebrew(app_handle: AppHandle) -> Result<(), String> {
    debug!("Installing Colima via Homebrew");

    // Create a channel for progress updates
    let (tx, mut rx) = mpsc::channel::<InstallationProgress>(100);

    // Clone the sender for the background task
    let tx_clone = tx.clone();

    // Spawn the installation task
    let installation_handle = tokio::spawn(async move {
        let mut progress = InstallationProgress {
            step: "Checking prerequisites...".to_string(),
            message: "Verifying system requirements".to_string(),
            percentage: 10,
            logs: vec![],
        };

        // Send initial progress
        let _ = tx_clone.send(progress.clone()).await;

        // Step 1: Install Colima
        progress.step = "Installing Colima...".to_string();
        progress.message = "Installing Colima via Homebrew".to_string();
        progress.percentage = 30;
        progress
            .logs
            .push("[INFO] Installing Colima via Homebrew".to_string());
        let _ = tx_clone.send(progress.clone()).await;

        let install_result = install_colima_packages().await;
        if let Err(e) = &install_result {
            progress.step = "Installation failed".to_string();
            progress.message = format!("Failed to install Colima: {}", e);
            progress.percentage = 100;
            progress.logs.push(format!("[ERROR] {}", e));
            let _ = tx_clone.send(progress.clone()).await;
            return Err(e.clone());
        }

        progress
            .logs
            .push("[INFO] Colima installation completed successfully".to_string());
        progress.percentage = 100;
        let _ = tx_clone.send(progress.clone()).await;

        Ok(())
    });

    // Handle progress updates and send them to the frontend
    let app_handle_clone = app_handle.clone();
    let _progress_handle = tokio::spawn(async move {
        while let Some(progress) = rx.recv().await {
            let _ = app_handle_clone.emit("installation-progress", progress);
        }
    });

    // Wait for installation to complete
    let result = installation_handle
        .await
        .map_err(|e| format!("Installation task failed: {}", e))?
        .and_then(|r| Ok(r));

    // Send completion event
    match &result {
        Ok(_) => {
            let _ = app_handle.emit("installation-complete", ());
        }
        Err(e) => {
            let _ = app_handle.emit("installation-error", e);
        }
    }

    result
}

#[instrument(skip_all, err)]
async fn install_colima_packages() -> Result<(), String> {
    debug!("Installing Colima packages via Homebrew");

    let packages = vec!["colima", "docker", "docker-compose"];

    for package in packages {
        debug!("Installing package: {}", package);

        let output = Command::new("brew")
            .arg("install")
            .arg(package)
            .output()
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
pub async fn start_colima_vm(app_handle: AppHandle, config: ColimaConfig) -> Result<(), String> {
    debug!("Starting Colima VM with config: {:?}", config);

    // Create a channel for progress updates
    let (tx, mut rx) = mpsc::channel::<InstallationProgress>(100);

    // Clone the sender for the background task
    let tx_clone = tx.clone();

    // Spawn the VM startup task
    let vm_handle = tokio::spawn(async move {
        let mut progress = InstallationProgress {
            step: "Starting Colima VM...".to_string(),
            message: "Initializing virtual machine".to_string(),
            percentage: 10,
            logs: vec![],
        };

        // Send initial progress
        let _ = tx_clone.send(progress.clone()).await;

        // Step 1: Check if Colima is already running
        progress.step = "Checking Colima status...".to_string();
        progress.message = "Verifying current VM status".to_string();
        progress.percentage = 20;
        progress
            .logs
            .push("[INFO] Checking Colima status".to_string());
        let _ = tx_clone.send(progress.clone()).await;

        let status_result = check_colima_status().await;
        if let Ok(true) = status_result {
            progress.step = "Colima already running".to_string();
            progress.message = "Colima VM is already running".to_string();
            progress.percentage = 100;
            progress
                .logs
                .push("[INFO] Colima VM is already running".to_string());
            let _ = tx_clone.send(progress.clone()).await;
            return Ok(());
        }

        // Step 2: Start Colima VM
        progress.step = "Starting VM...".to_string();
        progress.message = "Launching Colima virtual machine".to_string();
        progress.percentage = 40;
        progress.logs.push("[INFO] Starting Colima VM".to_string());
        let _ = tx_clone.send(progress.clone()).await;

        let start_result = start_colima_with_config(&config).await;
        if let Err(e) = &start_result {
            progress.step = "VM startup failed".to_string();
            progress.message = format!("Failed to start Colima VM: {}", e);
            progress.percentage = 100;
            progress.logs.push(format!("[ERROR] {}", e));
            let _ = tx_clone.send(progress.clone()).await;
            return Err(e.clone());
        }

        // Step 3: Validate startup
        progress.step = "Validating startup...".to_string();
        progress.message = "Testing Docker connectivity".to_string();
        progress.percentage = 80;
        progress
            .logs
            .push("[INFO] Validating Colima startup".to_string());
        let _ = tx_clone.send(progress.clone()).await;

        // Wait a bit for the VM to fully start
        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

        let validation_result = validate_colima_startup().await;
        if let Err(e) = &validation_result {
            progress.step = "Validation failed".to_string();
            progress.message = format!("Failed to validate startup: {}", e);
            progress.percentage = 100;
            progress.logs.push(format!("[ERROR] {}", e));
            let _ = tx_clone.send(progress.clone()).await;
            return Err(e.clone());
        }

        progress.step = "VM startup complete".to_string();
        progress.message = "Colima VM is running successfully".to_string();
        progress.percentage = 100;
        progress
            .logs
            .push("[INFO] Colima VM started successfully".to_string());
        let _ = tx_clone.send(progress.clone()).await;

        Ok(())
    });

    // Handle progress updates and send them to the frontend
    let app_handle_clone = app_handle.clone();
    let _progress_handle = tokio::spawn(async move {
        while let Some(progress) = rx.recv().await {
            let _ = app_handle_clone.emit("vm-startup-progress", progress);
        }
    });

    // Wait for VM startup to complete
    let result = vm_handle
        .await
        .map_err(|e| format!("VM startup task failed: {}", e))?
        .and_then(|r| Ok(r));

    // Send completion event
    match &result {
        Ok(_) => {
            let _ = app_handle.emit("vm-startup-complete", ());
        }
        Err(e) => {
            let _ = app_handle.emit("vm-startup-error", e);
        }
    }

    result
}

#[instrument(skip_all, err)]
async fn check_colima_status() -> Result<bool, String> {
    let output = Command::new("colima")
        .arg("status")
        .output()
        .map_err(|e| format!("Failed to check Colima status: {}", e))?;

    if !output.status.success() {
        return Ok(false);
    }

    let status_text = String::from_utf8_lossy(&output.stdout);
    Ok(status_text.contains("Running"))
}

#[instrument(skip_all, err)]
async fn start_colima_with_config(config: &ColimaConfig) -> Result<(), String> {
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

    let output = Command::new("colima")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to start Colima: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to start Colima: {}", stderr));
    }

    debug!("Colima started successfully");
    Ok(())
}

#[instrument(skip_all, err)]
async fn validate_colima_startup() -> Result<(), String> {
    debug!("Validating Colima startup");

    // Check if Docker is responding
    let docker_check = Command::new("docker")
        .arg("version")
        .output()
        .map_err(|e| format!("Docker command failed: {}", e))?;

    if !docker_check.status.success() {
        return Err("Docker is not responding after Colima startup".to_string());
    }

    // Check if we can connect to Docker daemon
    let info_check = Command::new("docker")
        .arg("info")
        .output()
        .map_err(|e| format!("Docker info command failed: {}", e))?;

    if !info_check.status.success() {
        return Err("Cannot connect to Docker daemon".to_string());
    }

    debug!("Colima startup validation successful");
    Ok(())
}

#[instrument(skip_all, err)]
pub async fn connect_to_docker_using_different_contexts() -> Result<Docker, String> {
    debug!("Trying to connect to Docker via different contexts");

    let context_output = Command::new("docker")
        .arg("context")
        .arg("ls")
        .arg("--format")
        .arg("{{.DockerEndpoint}}")
        .output();

    if let Ok(output) = context_output {
        if output.status.success() {
            let output_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            let socket_paths = output_str.lines();

            for socket_path in socket_paths {
                if socket_path.starts_with("unix://") {
                    let socket_path = socket_path.trim_start_matches("unix://");
                    debug!("Current Docker context socket: {}", socket_path);

                    if let Ok(docker) = Docker::connect_with_unix(
                        socket_path,
                        5,
                        bollard::API_DEFAULT_VERSION,
                    ) {
                        if docker.ping().await.is_ok() {
                            debug!("Successfully connected to Docker via context socket");
                            return Ok(docker);
                        }
                    }
                } else {
                    warn!(
                        "Current Docker context socket is not a Unix socket: {}",
                        socket_path
                    );
                }
            }
        }
    }

    Err("Failed to connect to Docker via context socket".to_string())
}
