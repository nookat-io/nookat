use super::{
    docker_exec_args, endpoints_with_the_current_context_first, DOCKER_CONTEXT_LIST_FORMAT,
};
use crate::entities::{ColimaHost, ColimaProfileStatus};
use crate::services::binary_install::{bin_dir, engine_prefix};
use crate::services::colima::{
    parse_colima_list, parse_host_sysctl, ColimaInstance, HOST_SYSCTL_KEYS,
};
use std::borrow::Cow;
use std::ffi::OsStr;
use std::path::PathBuf;
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

const ENGINE_BIN_ENV_VAR: &str = "NOOKAT_ENGINE_BIN";
const EXEC_WITH_ENGINE_BIN_FIRST_AND_NO_IMPLICIT_PROFILE: &str = r#"unset COLIMA_PROFILE; export PATH="${NOOKAT_ENGINE_BIN:+$NOOKAT_ENGINE_BIN:}$PATH"; exec "$0" "$@""#;
const SYSCTL: &str = "/usr/sbin/sysctl";

pub fn engine_bin_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|home| bin_dir(&engine_prefix(&home)))
}

async fn run_in_login_shell<I, S>(
    app: &AppHandle,
    program: &str,
    args: I,
) -> Result<Output, tauri_plugin_shell::Error>
where
    I: IntoIterator<Item = S>,
    S: AsRef<OsStr>,
{
    let command = app
        .shell()
        .command("zsh")
        .args([
            "-l",
            "-c",
            EXEC_WITH_ENGINE_BIN_FIRST_AND_NO_IMPLICIT_PROFILE,
            program,
        ])
        .args(args);

    match engine_bin_dir() {
        Some(engine_bin) => command.env(ENGINE_BIN_ENV_VAR, engine_bin),
        None => command,
    }
    .output()
    .await
}

#[instrument(skip_all, err)]
pub async fn open_container_terminal(
    app: &AppHandle,
    endpoint: &str,
    container_id: &str,
    shell: &str,
) -> Result<(), String> {
    let docker = docker_program();
    let command = typed_for_a_shell(std::iter::once(docker.as_str()).chain(docker_exec_args(
        endpoint,
        container_id,
        shell,
    )));

    let output = app
        .shell()
        .command("osascript")
        .args(osascript_args_running_in_terminal(&command))
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

fn docker_program() -> String {
    engine_bin_dir()
        .map(|engine_bin| engine_bin.join("docker"))
        .filter(|docker| docker.is_file())
        .map(|docker| docker.to_string_lossy().into_owned())
        .unwrap_or_else(|| "docker".to_string())
}

fn typed_for_a_shell<'a>(words: impl IntoIterator<Item = &'a str>) -> String {
    words
        .into_iter()
        .map(quoted_where_a_shell_would_change_it)
        .collect::<Vec<_>>()
        .join(" ")
}

fn quoted_where_a_shell_would_change_it(word: &str) -> Cow<'_, str> {
    let reads_literally = !word.is_empty()
        && word
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || "@+:,./_-".contains(c));

    if reads_literally {
        Cow::Borrowed(word)
    } else {
        Cow::Owned(format!("'{}'", word.replace('\'', r"'\''")))
    }
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
        ["context", "ls", "--format", DOCKER_CONTEXT_LIST_FORMAT],
    )
    .await
    .map_err(|e| format!("Failed to get Docker contexts: {}", e))?;

    if !context_output.status.success() {
        return Err("Failed to list Docker contexts".to_string());
    }

    Ok(endpoints_with_the_current_context_first(
        &String::from_utf8_lossy(&context_output.stdout),
    ))
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

#[instrument(skip_all, err)]
pub async fn inspect_current_docker_context(app: &AppHandle) -> Result<String, String> {
    let output = run_in_login_shell(app, "docker", ["context", "inspect"])
        .await
        .map_err(|e| format!("Failed to inspect the Docker context: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Failed to inspect the Docker context: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[instrument(skip_all, err)]
pub async fn use_docker_context(app: &AppHandle, context: &str) -> Result<(), String> {
    debug!("Switching the Docker CLI to the {} context", context);

    let output = run_in_login_shell(app, "docker", ["context", "use", context])
        .await
        .map_err(|e| format!("Failed to switch the Docker context: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Failed to switch the Docker context to {}: {}",
            context,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;
    use std::path::Path;
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
    fn types_an_ordinary_docker_command_as_a_person_would() {
        let command = typed_for_a_shell([
            "/Users/me/.nookat/engine/bin/docker",
            "--host",
            "unix:///Users/me/.colima/default/docker.sock",
            "exec",
            "-it",
            "1838a7db9b42",
            "sh",
        ]);

        assert_eq!(
            command,
            "/Users/me/.nookat/engine/bin/docker --host unix:///Users/me/.colima/default/docker.sock exec -it 1838a7db9b42 sh"
        );
    }

    #[test]
    fn quotes_what_a_shell_would_split_or_expand_so_each_word_arrives_unchanged() {
        let words = [
            "/Users/Jane Doe/.nookat/engine/bin/docker",
            "unix:///Users/o'brien/.colima/docker.sock",
            "$HOME",
            "*",
            "=docker",
            "",
        ];

        let output = Command::new("/bin/zsh")
            .env_clear()
            .args([
                "-f",
                "-c",
                &format!("printf '[%s]\\n' {}", typed_for_a_shell(words)),
            ])
            .output()
            .unwrap();

        let expected: String = words.iter().map(|word| format!("[{}]\n", word)).collect();
        assert_eq!(String::from_utf8(output.stdout).unwrap(), expected);
    }

    #[test]
    fn hands_the_command_to_the_script_as_an_argument() {
        let command = r#"docker exec -it 6989cd895c82 sh"#;

        let args = osascript_args_running_in_terminal(command);

        assert_eq!(args, ["-e", RUN_IN_A_TERMINAL_WINDOW, command]);
        assert!(!RUN_IN_A_TERMINAL_WINDOW.contains("docker"));
    }

    const SYSTEM_PATH: &str = "/usr/bin:/bin";

    fn write_executable(path: &Path, script: &str) {
        std::fs::write(path, script).unwrap();
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o755)).unwrap();
    }

    fn run_like_the_login_shell(engine_bin: Option<&Path>, program: &str, args: &[&str]) -> String {
        run_like_a_login_shell_exporting(&[], engine_bin, program, args)
    }

    fn run_like_a_login_shell_exporting(
        exported: &[(&str, &str)],
        engine_bin: Option<&Path>,
        program: &str,
        args: &[&str],
    ) -> String {
        let mut command = Command::new("/bin/zsh");
        command
            .env_clear()
            .env("PATH", SYSTEM_PATH)
            .envs(exported.iter().copied())
            .args([
                "-f",
                "-c",
                EXEC_WITH_ENGINE_BIN_FIRST_AND_NO_IMPLICIT_PROFILE,
                program,
            ])
            .args(args);
        if let Some(engine_bin) = engine_bin {
            command.env(ENGINE_BIN_ENV_VAR, engine_bin);
        }

        let output = command.output().unwrap();
        assert!(output.status.success(), "{:?}", output);
        String::from_utf8(output.stdout).unwrap()
    }

    #[test]
    fn runs_the_installed_engine_binaries_before_any_other_on_the_path() {
        let engine_bin = tempfile::tempdir().unwrap();
        write_executable(
            &engine_bin.path().join("colima"),
            "#!/bin/sh\necho \"engine colima\"\n",
        );

        let output = run_like_the_login_shell(Some(engine_bin.path()), "colima", &[]);

        assert_eq!(output, "engine colima\n");
    }

    #[test]
    fn programs_started_by_an_engine_binary_find_the_other_engine_binaries() {
        let engine_bin = tempfile::tempdir().unwrap();
        write_executable(
            &engine_bin.path().join("colima"),
            "#!/bin/sh\nexec limactl\n",
        );
        write_executable(
            &engine_bin.path().join("limactl"),
            "#!/bin/sh\necho \"engine limactl\"\n",
        );

        let output = run_like_the_login_shell(Some(engine_bin.path()), "colima", &[]);

        assert_eq!(output, "engine limactl\n");
    }

    #[test]
    fn passes_arguments_through_as_data() {
        let engine_bin = tempfile::tempdir().unwrap();
        let tricky = ["--profile=a b", "$(echo injected)", "'quoted'", "*"];

        let output = run_like_the_login_shell(
            Some(engine_bin.path()),
            "printf",
            &[["%s\n"].as_slice(), tricky.as_slice()].concat(),
        );

        assert_eq!(output, format!("{}\n", tricky.join("\n")));
    }

    #[test]
    fn hides_a_colima_profile_the_shell_selects_so_colima_list_shows_every_profile() {
        let output = run_like_a_login_shell_exporting(
            &[("COLIMA_PROFILE", "work")],
            None,
            "sh",
            &["-c", "echo \"${COLIMA_PROFILE:-every profile}\""],
        );

        assert_eq!(output, "every profile\n");
    }

    #[test]
    fn keeps_the_path_as_it_is_without_an_engine_directory() {
        let output = run_like_the_login_shell(None, "printenv", &["PATH"]);

        assert_eq!(output, format!("{SYSTEM_PATH}\n"));
    }
}
