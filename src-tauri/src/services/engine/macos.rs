use crate::entities::{
    ColimaConfig, ColimaEngineStopProgress, InstallationMethod, InstallationProgress,
};
use crate::services::engine::should_stop_vm;
use crate::services::shell::{
    check_colima_status, get_docker_context_endpoints, install_packages_via_homebrew,
    start_colima_with_config, stop_colima, validate_colima_startup,
};
use bollard::Docker;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::sync::mpsc;
use tracing::{debug, instrument, warn};

#[instrument(skip_all, err)]
pub async fn install_colima(
    app_handle: &AppHandle,
    method: InstallationMethod,
) -> Result<(), String> {
    debug!("Starting Colima installation via {:?}", method);

    match method {
        InstallationMethod::Homebrew => install_colima_via_homebrew(app_handle).await,
        InstallationMethod::Binary => Err("Binary installation not yet implemented".to_string()),
    }
}

#[instrument(skip_all, err)]
async fn install_colima_via_homebrew(app_handle: &AppHandle) -> Result<(), String> {
    debug!("Installing Colima via Homebrew");

    // Create a channel for progress updates
    let (tx, mut rx) = mpsc::channel::<InstallationProgress>(100);

    // Clone the sender for the background task
    let tx_clone = tx.clone();

    // Clone the app_handle for use in the background task
    let app_handle_clone = app_handle.clone();

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

        let packages = vec!["colima", "docker"];
        let install_result = install_packages_via_homebrew(&app_handle_clone, &packages).await;
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
        .map_err(|e| format!("Installation task failed: {}", e))?;

    // Send completion event
    let app_handle_for_events = app_handle.clone();
    match &result {
        Ok(_) => {
            let _ = app_handle_for_events.emit("installation-complete", ());
        }
        Err(e) => {
            let _ = app_handle_for_events.emit("installation-error", e);
        }
    }

    result
}

#[instrument(skip_all, err)]
pub async fn start_colima_vm(app_handle: &AppHandle, config: ColimaConfig) -> Result<(), String> {
    debug!("Starting Colima VM with config: {:?}", config);

    // Create a channel for progress updates
    let (tx, mut rx) = mpsc::channel::<InstallationProgress>(100);

    // Clone the sender for the background task
    let tx_clone = tx.clone();

    // Clone the app_handle for use in the background task
    let app_handle_clone = app_handle.clone();
    let app_handle_for_events = app_handle.clone();

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

        let status_result = check_colima_status(&app_handle_clone).await;
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

        let start_result = start_colima_with_config(&app_handle_clone, &config).await;
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

        let validation_result = validate_colima_startup(&app_handle_clone).await;
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
    let app_handle_for_progress = app_handle.clone();
    let _progress_handle = tokio::spawn(async move {
        while let Some(progress) = rx.recv().await {
            let _ = app_handle_for_progress.emit("vm-startup-progress", progress);
        }
    });

    // Wait for VM startup to complete
    let result = vm_handle
        .await
        .map_err(|e| format!("VM startup task failed: {}", e))?;

    // Send completion event
    match &result {
        Ok(_) => {
            let _ = app_handle_for_events.emit("vm-startup-complete", ());
        }
        Err(e) => {
            let _ = app_handle_for_events.emit("vm-startup-error", e);
        }
    }

    result
}

/// Poll `colima status` until the VM reports as stopped.
///
/// `colima stop` returns before the VM has fully torn down, so the shutdown has
/// to be observed rather than assumed after a fixed delay. The whole wait is
/// bounded, so a `colima status` invocation that never returns cannot wedge the
/// stop flow.
#[instrument(skip_all, err)]
async fn wait_for_colima_stopped(app_handle: &AppHandle) -> Result<(), String> {
    const POLL_INTERVAL: Duration = Duration::from_millis(500);
    const TIMEOUT: Duration = Duration::from_secs(60);

    // A status check can fail transiently while the VM tears down, so keep
    // polling on error and report the last failure only if the wait expires.
    let mut last_error: Option<String> = None;

    let poll = async {
        loop {
            match check_colima_status(app_handle).await {
                Ok(false) => return,
                Ok(true) => last_error = None,
                Err(e) => {
                    warn!("Failed to check Colima status while stopping: {}", e);
                    last_error = Some(e);
                }
            }

            tokio::time::sleep(POLL_INTERVAL).await;
        }
    };

    let stopped = tokio::time::timeout(TIMEOUT, poll).await.is_ok();

    if stopped {
        debug!("Colima VM reported as stopped");
        return Ok(());
    }

    Err(match last_error {
        Some(e) => format!(
            "Colima VM did not report as stopped within {} seconds; the last status check failed: {}",
            TIMEOUT.as_secs(),
            e
        ),
        None => format!(
            "Colima VM did not report as stopped within {} seconds",
            TIMEOUT.as_secs()
        ),
    })
}

#[instrument(skip_all, err)]
pub async fn stop_colima_vm(app_handle: &AppHandle) -> Result<(), String> {
    debug!("Stopping Colima VM");

    // Create a channel for progress updates
    let (tx, mut rx) = mpsc::channel::<ColimaEngineStopProgress>(100);

    // Clone the sender for the background task
    let tx_clone = tx.clone();

    // Clone the app_handle for use in the background task
    let app_handle_clone = app_handle.clone();
    let app_handle_for_events = app_handle.clone();

    // Spawn the VM startup task
    let vm_handle = tokio::spawn(async move {
        let mut progress = ColimaEngineStopProgress {
            step: "Stopping Colima VM...".to_string(),
            message: "Stopping Colima virtual machine".to_string(),
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

        let status_result = check_colima_status(&app_handle_clone).await;
        if !should_stop_vm(&status_result) {
            progress.step = "Colima VM is already stopped".to_string();
            progress.message = "Colima VM was not running, nothing to stop".to_string();
            progress.percentage = 100;
            progress
                .logs
                .push("[INFO] Colima VM is already stopped".to_string());
            let _ = tx_clone.send(progress.clone()).await;
            return Ok(progress);
        }

        // Step 2: Stop Colima VM
        progress.step = "Stopping VM...".to_string();
        progress.message = "Stopping Colima virtual machine".to_string();
        progress.percentage = 40;
        progress.logs.push("[INFO] Stopping Colima VM".to_string());
        let _ = tx_clone.send(progress.clone()).await;

        let stop_result = stop_colima(&app_handle_clone).await;
        if let Err(e) = &stop_result {
            progress.step = "VM stop failed".to_string();
            progress.message = format!("Failed to stop Colima VM: {}", e);
            progress.percentage = 100;
            progress.logs.push(format!("[ERROR] {}", e));
            let _ = tx_clone.send(progress.clone()).await;
            return Err(e.clone());
        }

        // Step 3: Confirm the VM actually went down
        progress.step = "Confirming VM shutdown...".to_string();
        progress.message = "Waiting for the Colima VM to report as stopped".to_string();
        progress.percentage = 70;
        progress
            .logs
            .push("[INFO] Waiting for Colima VM to report as stopped".to_string());
        let _ = tx_clone.send(progress.clone()).await;

        if let Err(e) = wait_for_colima_stopped(&app_handle_clone).await {
            progress.step = "VM stop failed".to_string();
            progress.message = e.clone();
            progress.percentage = 100;
            progress.logs.push(format!("[ERROR] {}", e));
            let _ = tx_clone.send(progress.clone()).await;
            return Err(e);
        }

        progress.step = "VM stop complete".to_string();
        progress.message = "Colima VM is stopped successfully".to_string();
        progress.percentage = 100;
        progress
            .logs
            .push("[INFO] Colima VM stopped successfully".to_string());
        let _ = tx_clone.send(progress.clone()).await;

        Ok(progress)
    });

    // Handle progress updates and send them to the frontend
    let app_handle_for_progress = app_handle.clone();
    let _progress_handle = tokio::spawn(async move {
        while let Some(progress) = rx.recv().await {
            let _ = app_handle_for_progress.emit("vm-stop-progress", progress);
        }
    });

    // Wait for VM stop to complete
    let result = vm_handle
        .await
        .map_err(|e| format!("VM stop task failed: {}", e))?;

    // Send completion event. The terminal progress rides along with it: the
    // relay task above may not have drained the channel yet, so the frontend
    // cannot rely on the last `vm-stop-progress` arriving first.
    match &result {
        Ok(final_progress) => {
            let _ = app_handle_for_events.emit("vm-stop-complete", final_progress);
        }
        Err(e) => {
            let _ = app_handle_for_events.emit("vm-stop-error", e);
        }
    }

    result.map(|_| ())
}

#[instrument(skip_all, err)]
pub async fn connect_to_docker_using_different_contexts(app: &AppHandle) -> Result<Docker, String> {
    debug!("Trying to connect to Docker via different contexts");

    let endpoints = get_docker_context_endpoints(app).await?;

    for socket_path in endpoints {
        if socket_path.starts_with("unix://") {
            let socket_path = socket_path.trim_start_matches("unix://");
            debug!("Current Docker context socket: {}", socket_path);

            if let Ok(docker) =
                Docker::connect_with_unix(socket_path, 5, bollard::API_DEFAULT_VERSION)
            {
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

    Err("Failed to connect to Docker via context socket".to_string())
}
