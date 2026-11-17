use crate::entities::{ColimaHost, ColimaProfileStatus};
use crate::services::colima::{
    parse_colima_list, parse_host_sysctl, ColimaInstance, HOST_SYSCTL_KEYS,
};
use std::ffi::OsStr;
use tauri::AppHandle;
use tauri_plugin_shell::process::Output;
use tauri_plugin_shell::ShellExt;
use tracing::{debug, instrument};

const RUN_IN_A_TERMINAL_WINDOW: &str = r#"on run argv
    set shellCommand to item 1 of argv
    set terminalWasRunning to application "Terminal" is running
    tell application "Terminal"
        if terminalWasRunning or (count of windows) is 0 then
            do script shellCommand
        else
            do script shellCommand in window 1
        end if
        activate
    end tell
end run"#;

const EXEC_WITHOUT_AN_IMPLICIT_COLIMA_PROFILE: &str = r#"unset COLIMA_PROFILE; exec "$0" "$@""#;
const SYSCTL: &str = "/usr/sbin/sysctl";

async fn run_in_login_shell<I, S>(
    app: &AppHandle,
    program: &str,
    args: I,
) -> Result<Output, tauri_plugin_shell::Error>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    app.shell()
        .command("zsh")
        .args(["-l", "-c", EXEC_WITHOUT_AN_IMPLICIT_COLIMA_PROFILE, program])
        .args(args)
        .output()
        .await
}

#[instrument(skip_all, err)]
pub async fn open_container_terminal(
    app: &AppHandle,
    container_id: &str,
    shell: &str,
) -> Result<(), String> {
    let output = app
        .shell()
        .command("osascript")
        .args(osascript_args_running_in_terminal(&format!(
            "docker exec -it {} {}",
            container_id, shell
        )))
        .output()
        .await
        .map_err(|e| format!("Failed to run osascript: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Terminal did not open: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(())
}

fn osascript_args_running_in_terminal(shell_command: &str) -> [&str; 3] {
    ["-e", RUN_IN_A_TERMINAL_WINDOW, shell_command]
}

#[instrument(skip_all, err)]
async fn is_command_available(app: &AppHandle, command: &str) -> Result<bool, String> {
    let output = run_in_login_shell(app, "which", [command])
        .await
        .map_err(|e| format!("Failed to check {} availability: {}", command, e))?;

    Ok(output.status.success())
}

#[instrument(skip_all, err)]
async fn command_version(app: &AppHandle, command: &str) -> Result<Option<String>, String> {
    let output = run_in_login_shell(app, command, ["--version"])
        .await
        .map_err(|e| format!("Failed to check {} version: {}", command, e))?;

    if !output.status.success() {
        return Ok(None);
    }

    Ok(Some(
        String::from_utf8_lossy(&output.stdout).trim().to_string(),
    ))
}

#[instrument(skip_all, err)]
pub async fn is_docker_command_available(app: &AppHandle) -> Result<bool, String> {
    debug!("Checking if Docker command is available");

    fn is_docker_installed(output_str: &str) -> bool {
        output_str.to_lowercase().contains("version")
    }

    let output = run_in_login_shell(app, "docker", ["--version"])
        .await
        .map_err(|e| format!("Failed to execute docker command: {}", e))?;

    if !output.status.success() {
        debug!(
            "Docker command is not available, output: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        return Ok(false);
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    debug!("Docker command is available, output: {}", output_str);
    let result = is_docker_installed(&output_str);
    debug!("Docker command is available, result: {}", result);
    Ok(result)
}

#[instrument(skip_all, err)]
pub async fn is_homebrew_available(app: &AppHandle) -> Result<bool, String> {
    if !is_command_available(app, "brew").await? {
        return Ok(false);
    }

    Ok(command_version(app, "brew").await?.is_some())
}

#[instrument(skip_all, err)]
pub async fn is_colima_available(app: &AppHandle) -> Result<bool, String> {
    debug!("Checking if Colima is available on the system");

    if !is_command_available(app, "colima").await? {
        debug!("Colima command not found in PATH");
        return Ok(false);
    }

    let Some(version) = command_version(app, "colima").await? else {
        debug!("Colima command exists but failed to execute");
        return Ok(false);
    };

    debug!("Colima is available, version: {}", version);
    Ok(true)
}

#[instrument(skip_all, err)]
pub async fn install_packages_via_homebrew(
    app: &AppHandle,
    packages: &[&str],
) -> Result<(), String> {
    debug!("Installing packages via Homebrew: {:?}", packages);

    for package in packages {
        debug!("Installing package: {}", package);

        let output = run_in_login_shell(app, "brew", ["install", package])
            .await
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
pub async fn get_docker_context_endpoints(app: &AppHandle) -> Result<Vec<String>, String> {
    let context_output = run_in_login_shell(
        app,
        "docker",
        ["context", "ls", "--format", "{{.DockerEndpoint}}"],
    )
    .await
    .map_err(|e| format!("Failed to get Docker contexts: {}", e))?;

    if !context_output.status.success() {
        return Err("Failed to list Docker contexts".to_string());
    }

    let output_str = String::from_utf8_lossy(&context_output.stdout)
        .trim()
        .to_string();
    Ok(output_str
        .lines()
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .collect())
}

#[instrument(skip_all, err)]
pub async fn list_colima_instances(app: &AppHandle) -> Result<Vec<ColimaInstance>, String> {
    let output = run_in_login_shell(app, "colima", ["list", "--json"])
        .await
        .map_err(|e| format!("Failed to list Colima profiles: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Failed to list Colima profiles: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    parse_colima_list(&String::from_utf8_lossy(&output.stdout))
}

#[instrument(skip_all, err)]
pub async fn colima_profile_status(
    app: &AppHandle,
    profile: &str,
) -> Result<ColimaProfileStatus, String> {
    let instances = list_colima_instances(app).await?;
    let status = instances
        .into_iter()
        .find(|instance| instance.name == profile)
        .map_or(ColimaProfileStatus::Missing, |instance| {
            instance.status.unwrap_or(ColimaProfileStatus::Unknown)
        });

    Ok(status)
}

#[instrument(skip_all, err)]
pub async fn read_colima_host(app: &AppHandle) -> Result<ColimaHost, String> {
    let output = app
        .shell()
        .command(SYSCTL)
        .args(HOST_SYSCTL_KEYS)
        .output()
        .await
        .map_err(|e| format!("Failed to read host hardware with sysctl: {}", e))?;

    parse_host_sysctl(&String::from_utf8_lossy(&output.stdout))
}

#[instrument(skip_all, err)]
pub async fn stop_colima(app: &AppHandle, profile: &str) -> Result<(), String> {
    debug!("Stopping Colima profile {}", profile);

    let output = run_in_login_shell(app, "colima", ["stop", &format!("--profile={profile}")])
        .await
        .map_err(|e| format!("Failed to stop Colima: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to stop Colima: {}", stderr));
    }

    debug!("Colima stopped successfully");
    Ok(())
}

#[instrument(skip_all, err)]
pub async fn start_colima(app: &AppHandle, args: &[String]) -> Result<(), String> {
    debug!("Executing: colima {:?}", args);

    let output = run_in_login_shell(app, "colima", args)
        .await
        .map_err(|e| format!("Failed to start Colima: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to start Colima: {}", stderr));
    }

    debug!("Colima started successfully");
    Ok(())
}

#[instrument(skip_all, err(level = "debug"))]
pub async fn check_docker_responds(app: &AppHandle) -> Result<(), String> {
    let docker_check = run_in_login_shell(app, "docker", ["version"])
        .await
        .map_err(|e| format!("Docker command failed: {}", e))?;

    if !docker_check.status.success() {
        return Err(format!(
            "docker version failed: {}",
            String::from_utf8_lossy(&docker_check.stderr).trim()
        ));
    }

    let info_check = run_in_login_shell(app, "docker", ["info"])
        .await
        .map_err(|e| format!("Docker info command failed: {}", e))?;

    if !info_check.status.success() {
        return Err(format!(
            "docker info failed: {}",
            String::from_utf8_lossy(&info_check.stderr).trim()
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Command;

    #[test]
    fn the_script_that_opens_terminal_compiles() {
        let compiled =
            std::env::temp_dir().join(format!("nookat-terminal-{}.scpt", std::process::id()));

        let output = Command::new("osacompile")
            .arg("-o")
            .arg(&compiled)
            .args(["-e", RUN_IN_A_TERMINAL_WINDOW])
            .output()
            .expect("osacompile runs");
        std::fs::remove_file(&compiled).ok();

        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    #[test]
    fn hands_the_command_to_the_script_as_an_argument() {
        let command = r#"docker exec -it 6989cd895c82 sh"#;

        let args = osascript_args_running_in_terminal(command);

        assert_eq!(args, ["-e", RUN_IN_A_TERMINAL_WINDOW, command]);
        assert!(!RUN_IN_A_TERMINAL_WINDOW.contains("docker"));
    }

    fn run_like_a_login_shell_exporting(
        exported: &[(&str, &str)],
        program: &str,
        args: &[&str],
    ) -> String {
        let output = Command::new("/bin/zsh")
            .env_clear()
            .env("PATH", "/usr/bin:/bin")
            .envs(exported.iter().copied())
            .args(["-f", "-c", EXEC_WITHOUT_AN_IMPLICIT_COLIMA_PROFILE, program])
            .args(args)
            .output()
            .unwrap();
        assert!(output.status.success(), "{:?}", output);
        String::from_utf8(output.stdout).unwrap()
    }

    #[test]
    fn passes_arguments_through_as_data() {
        let tricky = ["--profile=a b", "$(echo injected)", "'quoted'", "*"];

        let output = run_like_a_login_shell_exporting(
            &[],
            "printf",
            &[["%s\n"].as_slice(), tricky.as_slice()].concat(),
        );

        assert_eq!(output, format!("{}\n", tricky.join("\n")));
    }

    #[test]
    fn hides_a_colima_profile_the_shell_selects_so_colima_list_shows_every_profile() {
        let output = run_like_a_login_shell_exporting(
            &[("COLIMA_PROFILE", "work")],
            "sh",
            &["-c", "echo \"${COLIMA_PROFILE:-every profile}\""],
        );

        assert_eq!(output, "every profile\n");
    }
}
