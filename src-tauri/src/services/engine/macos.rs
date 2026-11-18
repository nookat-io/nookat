use crate::entities::{
    ColimaConfig, ColimaEngineStopProgress, InstallationMethod, InstallationProgress,
};
use crate::services::engine::should_stop_vm;
use crate::services::shell::{
    check_colima_status, get_docker_context_endpoints, install_packages_via_homebrew,
    start_colima_with_config, stop_colima, validate_colima_startup,
};
use bollard::Docker;
use serde::Serialize;
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tracing::{debug, instrument, warn};

const STATUS_POLL_INTERVAL: Duration = Duration::from_millis(500);
const DOCKER_READY_TIMEOUT: Duration = Duration::from_secs(60);
const VM_STOP_TIMEOUT: Duration = Duration::from_secs(60);

fn emit(app_handle: &AppHandle, event: &str, payload: impl Serialize + Clone) {
    if let Err(e) = app_handle.emit(event, payload) {
        warn!("Failed to emit {}: {}", event, e);
    }
}

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

    let task_app_handle = app_handle.clone();
    let installation_handle = tokio::spawn(async move {
        let app_handle = task_app_handle;
        let report = |progress: &InstallationProgress| {
            emit(&app_handle, "installation-progress", progress);
        };

        let mut progress = InstallationProgress {
            step: "Checking prerequisites...".to_string(),
            message: "Verifying system requirements".to_string(),
            percentage: 10,
            logs: vec![],
        };
        report(&progress);

        progress.step = "Installing Colima...".to_string();
        progress.message = "Installing Colima via Homebrew".to_string();
        progress.percentage = 30;
        progress
            .logs
            .push("[INFO] Installing Colima via Homebrew".to_string());
        report(&progress);

        let packages = vec!["colima", "docker"];
        if let Err(e) = install_packages_via_homebrew(&app_handle, &packages).await {
            progress.step = "Installation failed".to_string();
            progress.message = format!("Failed to install Colima: {}", e);
            progress.percentage = 100;
            progress.logs.push(format!("[ERROR] {}", e));
            report(&progress);
            return Err(e);
        }

        progress
            .logs
            .push("[INFO] Colima installation completed successfully".to_string());
        progress.percentage = 100;
        report(&progress);

        Ok(())
    });

    let result = installation_handle
        .await
        .map_err(|e| format!("Installation task failed: {}", e))?;

    match &result {
        Ok(()) => emit(app_handle, "installation-complete", ()),
        Err(e) => emit(app_handle, "installation-error", e),
    }

    result
}

#[instrument(skip_all, err)]
pub async fn start_colima_vm(app_handle: &AppHandle, config: ColimaConfig) -> Result<(), String> {
    debug!("Starting Colima VM with config: {:?}", config);

    let task_app_handle = app_handle.clone();
    let vm_handle = tokio::spawn(async move {
        let app_handle = task_app_handle;
        let report = |progress: &InstallationProgress| {
            emit(&app_handle, "vm-startup-progress", progress);
        };

        let mut progress = InstallationProgress {
            step: "Starting Colima VM...".to_string(),
            message: "Initializing virtual machine".to_string(),
            percentage: 10,
            logs: vec![],
        };
        report(&progress);

        progress.step = "Checking Colima status...".to_string();
        progress.message = "Verifying current VM status".to_string();
        progress.percentage = 20;
        progress
            .logs
            .push("[INFO] Checking Colima status".to_string());
        report(&progress);

        if let Ok(true) = check_colima_status(&app_handle).await {
            progress.step = "Colima already running".to_string();
            progress.message = "Colima VM is already running".to_string();
            progress.percentage = 100;
            progress
                .logs
                .push("[INFO] Colima VM is already running".to_string());
            report(&progress);
            return Ok(());
        }

        progress.step = "Starting VM...".to_string();
        progress.message = "Launching Colima virtual machine".to_string();
        progress.percentage = 40;
        progress.logs.push("[INFO] Starting Colima VM".to_string());
        report(&progress);

        if let Err(e) = start_colima_with_config(&app_handle, &config).await {
            progress.step = "VM startup failed".to_string();
            progress.message = format!("Failed to start Colima VM: {}", e);
            progress.percentage = 100;
            progress.logs.push(format!("[ERROR] {}", e));
            report(&progress);
            return Err(e);
        }

        progress.step = "Validating startup...".to_string();
        progress.message = "Testing Docker connectivity".to_string();
        progress.percentage = 80;
        progress
            .logs
            .push("[INFO] Validating Colima startup".to_string());
        report(&progress);

        if let Err(e) = wait_for_docker_to_respond(&app_handle).await {
            progress.step = "Validation failed".to_string();
            progress.message = format!("Failed to validate startup: {}", e);
            progress.percentage = 100;
            progress.logs.push(format!("[ERROR] {}", e));
            report(&progress);
            return Err(e);
        }

        progress.step = "VM startup complete".to_string();
        progress.message = "Colima VM is running successfully".to_string();
        progress.percentage = 100;
        progress
            .logs
            .push("[INFO] Colima VM started successfully".to_string());
        report(&progress);

        Ok(())
    });

    let result = vm_handle
        .await
        .map_err(|e| format!("VM startup task failed: {}", e))?;

    match &result {
        Ok(()) => emit(app_handle, "vm-startup-complete", ()),
        Err(e) => emit(app_handle, "vm-startup-error", e),
    }

    result
}

#[instrument(skip_all, err)]
async fn wait_for_docker_to_respond(app_handle: &AppHandle) -> Result<(), String> {
    let mut last_validation_error = String::new();

    let poll = async {
        loop {
            match validate_colima_startup(app_handle).await {
                Ok(()) => return,
                Err(e) => {
                    debug!("Docker is not responding yet: {}", e);
                    last_validation_error = e;
                }
            }

            tokio::time::sleep(STATUS_POLL_INTERVAL).await;
        }
    };

    if tokio::time::timeout(DOCKER_READY_TIMEOUT, poll)
        .await
        .is_ok()
    {
        debug!("Docker is responding after Colima startup");
        return Ok(());
    }

    Err(format!(
        "Docker did not respond within {} seconds of Colima starting: {}",
        DOCKER_READY_TIMEOUT.as_secs(),
        last_validation_error
    ))
}

#[instrument(skip_all, err)]
async fn wait_for_colima_stopped(app_handle: &AppHandle) -> Result<(), String> {
    let mut last_status_check_error: Option<String> = None;

    let poll = async {
        loop {
            match check_colima_status(app_handle).await {
                Ok(false) => return,
                Ok(true) => last_status_check_error = None,
                Err(e) => {
                    warn!("Failed to check Colima status while stopping: {}", e);
                    last_status_check_error = Some(e);
                }
            }

            tokio::time::sleep(STATUS_POLL_INTERVAL).await;
        }
    };

    if tokio::time::timeout(VM_STOP_TIMEOUT, poll).await.is_ok() {
        debug!("Colima VM reported as stopped");
        return Ok(());
    }

    Err(match last_status_check_error {
        Some(e) => format!(
            "Colima VM did not report as stopped within {} seconds; the last status check failed: {}",
            VM_STOP_TIMEOUT.as_secs(),
            e
        ),
        None => format!(
            "Colima VM did not report as stopped within {} seconds",
            VM_STOP_TIMEOUT.as_secs()
        ),
    })
}

#[instrument(skip_all, err)]
pub async fn stop_colima_vm(app_handle: &AppHandle) -> Result<(), String> {
    debug!("Stopping Colima VM");

    let task_app_handle = app_handle.clone();
    let vm_handle = tokio::spawn(async move {
        let app_handle = task_app_handle;
        let report = |progress: &ColimaEngineStopProgress| {
            emit(&app_handle, "vm-stop-progress", progress);
        };

        let mut progress = ColimaEngineStopProgress {
            step: "Stopping Colima VM...".to_string(),
            message: "Stopping Colima virtual machine".to_string(),
            percentage: 10,
            logs: vec![],
        };
        report(&progress);

        progress.step = "Checking Colima status...".to_string();
        progress.message = "Verifying current VM status".to_string();
        progress.percentage = 20;
        progress
            .logs
            .push("[INFO] Checking Colima status".to_string());
        report(&progress);

        if !should_stop_vm(&check_colima_status(&app_handle).await) {
            progress.step = "Colima VM is already stopped".to_string();
            progress.message = "Colima VM was not running, nothing to stop".to_string();
            progress.percentage = 100;
            progress
                .logs
                .push("[INFO] Colima VM is already stopped".to_string());
            report(&progress);
            return Ok(progress);
        }

        progress.step = "Stopping VM...".to_string();
        progress.message = "Stopping Colima virtual machine".to_string();
        progress.percentage = 40;
        progress.logs.push("[INFO] Stopping Colima VM".to_string());
        report(&progress);

        if let Err(e) = stop_colima(&app_handle).await {
            progress.step = "VM stop failed".to_string();
            progress.message = format!("Failed to stop Colima VM: {}", e);
            progress.percentage = 100;
            progress.logs.push(format!("[ERROR] {}", e));
            report(&progress);
            return Err(e);
        }

        progress.step = "Confirming VM shutdown...".to_string();
        progress.message = "Waiting for the Colima VM to report as stopped".to_string();
        progress.percentage = 70;
        progress
            .logs
            .push("[INFO] Waiting for Colima VM to report as stopped".to_string());
        report(&progress);

        if let Err(e) = wait_for_colima_stopped(&app_handle).await {
            progress.step = "VM stop failed".to_string();
            progress.message = e.clone();
            progress.percentage = 100;
            progress.logs.push(format!("[ERROR] {}", e));
            report(&progress);
            return Err(e);
        }

        progress.step = "VM stop complete".to_string();
        progress.message = "Colima VM is stopped successfully".to_string();
        progress.percentage = 100;
        progress
            .logs
            .push("[INFO] Colima VM stopped successfully".to_string());
        report(&progress);

        Ok(progress)
    });

    let result = vm_handle
        .await
        .map_err(|e| format!("VM stop task failed: {}", e))?;

    match &result {
        Ok(final_progress) => emit(app_handle, "vm-stop-complete", final_progress),
        Err(e) => emit(app_handle, "vm-stop-error", e),
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
