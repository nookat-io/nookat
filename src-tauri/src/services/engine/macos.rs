use crate::entities::{
    BinaryInstallPlan, ColimaEngineStopProgress, ColimaProfileStatus, ColimaVm,
    ColimaVmSettingsChanges, DockerCliContext, InstallationMethod,
};
use crate::services::binary_install::{
    engine_prefix, install_plan, install_releases, pinned_releases, Downloader, InstallProgress,
};
use crate::services::colima::{
    colima_docker_context_name, colima_docker_socket, colima_home, colima_profile,
    colima_profile_name, colima_start_args, docker_responds_on, parse_current_docker_context,
    parse_profile_config, performance_warnings, profile_config_path, ColimaProfileConfig,
    PROFILE_ENV_VAR,
};
use crate::services::engine::{should_stop_vm, CommandProgress};
use crate::services::shell::{
    colima_profile_status, inspect_current_docker_context, install_package_via_homebrew,
    list_colima_instances, read_colima_host, start_colima, stop_colima, use_docker_context,
};
use serde::Serialize;
use std::future::Future;
use std::path::{Path, PathBuf};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tracing::{debug, instrument, warn};

const INSTALLATION_PROGRESS: &str = "installation-progress";
const HOMEBREW_PACKAGES: [&str; 2] = ["colima", "docker"];

const STATUS_POLL_INTERVAL: Duration = Duration::from_millis(500);
const DOCKER_READY_TIMEOUT: Duration = Duration::from_secs(60);
const VM_STOP_TIMEOUT: Duration = Duration::from_secs(60);

fn emit(app_handle: &AppHandle, event: &str, payload: impl Serialize + Clone) {
    if let Err(e) = app_handle.emit(event, payload) {
        warn!("Failed to emit {}: {}", event, e);
    }
}

fn current_colima_profile() -> String {
    colima_profile_name(std::env::var(PROFILE_ENV_VAR).ok().as_deref())
}

fn home_dir() -> Result<PathBuf, String> {
    dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())
}

fn current_colima_home() -> Result<PathBuf, String> {
    Ok(colima_home(
        &home_dir()?,
        |name| std::env::var(name).ok(),
        |dir| dir.exists(),
    ))
}

pub fn managed_colima_endpoint() -> Option<String> {
    let socket = colima_docker_socket(&current_colima_home().ok()?, &current_colima_profile());
    Some(format!("unix://{}", socket.display()))
}

fn read_profile_config(path: &Path) -> Option<ColimaProfileConfig> {
    let yaml = std::fs::read_to_string(path)
        .inspect_err(|e| warn!("Failed to read Colima profile config {:?}: {}", path, e))
        .ok()?;

    parse_profile_config(&yaml)
        .inspect_err(|e| warn!("Failed to parse Colima profile config {:?}: {}", path, e))
        .ok()
}

#[instrument(skip_all, err)]
pub async fn read_colima_vm(app_handle: &AppHandle) -> Result<ColimaVm, String> {
    let profile_name = current_colima_profile();
    let host = read_colima_host(app_handle).await?;
    let instances = list_colima_instances(app_handle).await?;
    let instance = instances
        .iter()
        .find(|instance| instance.name == profile_name);

    let colima_home = current_colima_home()?;
    let config = instance
        .and_then(|_| read_profile_config(&profile_config_path(&colima_home, &profile_name)));

    let profile = colima_profile(&profile_name, instance, config.as_ref(), &host);
    let warnings = performance_warnings(&profile, &host);
    let docker_context = read_docker_cli_context(
        app_handle,
        &colima_docker_socket(&colima_home, &profile_name),
    )
    .await;

    Ok(ColimaVm {
        profile,
        host,
        warnings,
        docker_context,
    })
}

async fn read_colima_vm_and_socket(app_handle: &AppHandle) -> Result<(ColimaVm, PathBuf), String> {
    let vm = read_colima_vm(app_handle).await?;
    let socket = colima_docker_socket(&current_colima_home()?, &vm.profile.name);
    Ok((vm, socket))
}

async fn read_docker_cli_context(
    app_handle: &AppHandle,
    colima_socket: &Path,
) -> Option<DockerCliContext> {
    inspect_current_docker_context(app_handle)
        .await
        .and_then(|output| parse_current_docker_context(&output, colima_socket))
        .inspect_err(|e| warn!("Failed to read the current Docker context: {}", e))
        .ok()
}

#[instrument(skip_all, err)]
pub async fn use_colima_docker_context(app_handle: &AppHandle) -> Result<(), String> {
    let context = colima_docker_context_name(&current_colima_profile());
    use_docker_context(app_handle, &context).await
}

#[instrument(skip_all, err)]
pub async fn binary_install_plan(app_handle: &AppHandle) -> Result<BinaryInstallPlan, String> {
    let host = read_colima_host(app_handle).await?;
    Ok(install_plan(
        &pinned_releases(host.architecture),
        &engine_prefix(&home_dir()?),
    ))
}

async fn is_colima_running(app_handle: &AppHandle, profile: &str) -> Result<bool, String> {
    Ok(colima_profile_status(app_handle, profile).await? == ColimaProfileStatus::Running)
}

#[instrument(skip_all, err)]
pub async fn install_colima(
    app_handle: &AppHandle,
    method: InstallationMethod,
) -> Result<(), String> {
    debug!("Starting Colima installation via {:?}", method);

    match method {
        InstallationMethod::Homebrew => {
            run_installation(app_handle, install_via_homebrew(app_handle.clone())).await
        }
        InstallationMethod::Binary => {
            run_installation(app_handle, install_pinned_releases(app_handle.clone())).await
        }
    }
}

async fn run_installation(
    app_handle: &AppHandle,
    installation: impl Future<Output = Result<(), String>> + Send + 'static,
) -> Result<(), String> {
    let result = tokio::spawn(installation)
        .await
        .map_err(|e| format!("Installation task failed: {}", e))?;

    match &result {
        Ok(()) => emit(app_handle, "installation-complete", ()),
        Err(e) => emit(app_handle, "installation-error", e),
    }

    result
}

#[instrument(skip_all, err)]
async fn install_via_homebrew(app_handle: AppHandle) -> Result<(), String> {
    debug!("Installing Colima via Homebrew");

    let report = |progress: &CommandProgress| {
        emit(&app_handle, INSTALLATION_PROGRESS, progress.current());
    };

    let mut progress = CommandProgress::new(
        "Installing Colima...",
        "Installing Colima with Homebrew",
        "Installing Colima with Homebrew",
    );

    for (index, package) in HOMEBREW_PACKAGES.iter().enumerate() {
        progress.begin_homebrew_install(package, index + 1, HOMEBREW_PACKAGES.len());
        report(&progress);

        let installed = install_package_via_homebrew(&app_handle, package, |line| {
            progress.output_line(line);
            report(&progress);
        })
        .await;

        if let Err(e) = installed {
            progress.fail(
                "Installation failed",
                &format!("Failed to install Colima: {}", e),
                &e,
            );
            report(&progress);
            return Err(e);
        }
    }

    progress.succeed(
        "Installation complete",
        "Colima installation completed successfully",
    );
    report(&progress);

    Ok(())
}

#[instrument(skip_all, err)]
async fn install_pinned_releases(app_handle: AppHandle) -> Result<(), String> {
    let host = read_colima_host(&app_handle).await?;
    let releases = pinned_releases(host.architecture);
    let prefix = engine_prefix(&home_dir()?);
    let downloader = Downloader::new()?;
    debug!("Installing {} releases into {:?}", releases.len(), prefix);

    let mut progress = InstallProgress::new(&releases, &prefix);
    emit(&app_handle, INSTALLATION_PROGRESS, progress.current());

    let result = install_releases(&downloader, &releases, &prefix, |event| {
        if progress.record(&event) {
            emit(&app_handle, INSTALLATION_PROGRESS, progress.current());
        }
    })
    .await;

    if let Err(e) = &result {
        progress.record_failure(e);
        emit(&app_handle, INSTALLATION_PROGRESS, progress.current());
    }

    result
}

#[instrument(skip_all, err)]
pub async fn start_colima_vm(
    app_handle: &AppHandle,
    changes: ColimaVmSettingsChanges,
) -> Result<(), String> {
    debug!("Starting Colima VM with changes: {:?}", changes);

    let task_app_handle = app_handle.clone();
    let vm_handle = tokio::spawn(async move {
        let app_handle = task_app_handle;
        let report = |progress: &CommandProgress| {
            emit(&app_handle, "vm-startup-progress", progress.current());
        };

        let mut progress = CommandProgress::new(
            "Checking Colima status...",
            "Verifying current VM status",
            "Checking Colima status",
        );
        report(&progress);

        let (vm, colima_socket) = match read_colima_vm_and_socket(&app_handle).await {
            Ok(vm_and_socket) => vm_and_socket,
            Err(e) => {
                progress.fail(
                    "VM startup failed",
                    &format!("Failed to read the Colima profile: {}", e),
                    &e,
                );
                report(&progress);
                return Err(e);
            }
        };

        if vm.profile.status == ColimaProfileStatus::Running {
            progress.succeed("Colima already running", "Colima VM is already running");
            report(&progress);
            return Ok(());
        }

        let existing_settings =
            (vm.profile.status != ColimaProfileStatus::Missing).then_some(&vm.profile.settings);
        let args = colima_start_args(&vm.profile.name, existing_settings, &changes, &vm.host);
        progress.begin_command("Starting VM...", &format!("colima {}", args.join(" ")));
        report(&progress);

        let started = start_colima(&app_handle, &args, |line| {
            progress.output_line(line);
            report(&progress);
        })
        .await;

        if let Err(e) = started {
            progress.fail(
                "VM startup failed",
                &format!("Failed to start Colima VM: {}", e),
                &e,
            );
            report(&progress);
            return Err(e);
        }

        progress.begin(
            "Validating startup...",
            "Testing Docker connectivity",
            "Validating Colima startup",
        );
        report(&progress);

        if let Err(e) = wait_for_docker_to_respond(&colima_socket).await {
            progress.fail(
                "Validation failed",
                &format!("Failed to validate startup: {}", e),
                &e,
            );
            report(&progress);
            return Err(e);
        }

        progress.succeed("VM startup complete", "Colima VM started successfully");
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
async fn wait_for_docker_to_respond(colima_socket: &Path) -> Result<(), String> {
    let mut last_validation_error = String::new();

    let poll = async {
        loop {
            match docker_responds_on(colima_socket).await {
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
async fn wait_for_colima_stopped(app_handle: &AppHandle, profile: &str) -> Result<(), String> {
    let mut last_status_check_error: Option<String> = None;

    let poll = async {
        loop {
            match is_colima_running(app_handle, profile).await {
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
        let profile = current_colima_profile();
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

        if !should_stop_vm(&is_colima_running(&app_handle, &profile).await) {
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

        if let Err(e) = stop_colima(&app_handle, &profile).await {
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

        if let Err(e) = wait_for_colima_stopped(&app_handle, &profile).await {
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
