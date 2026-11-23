#[cfg(any(target_os = "macos", test))]
use tauri_plugin_shell::process::{CommandEvent, TerminatedPayload};

#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::*;

#[cfg(target_os = "windows")]
mod windows;

#[cfg(target_os = "windows")]
pub use windows::*;

#[cfg(target_os = "linux")]
mod linux;

#[cfg(target_os = "linux")]
pub use linux::*;

pub const DOCKER_CONTEXT_LIST_FORMAT: &str = "{{.Current}}\t{{.DockerEndpoint}}";

pub fn docker_exec_args<'a>(
    endpoint: &'a str,
    container_id: &'a str,
    shell: &'a str,
) -> [&'a str; 6] {
    ["--host", endpoint, "exec", "-it", container_id, shell]
}

pub fn endpoints_with_the_current_context_first(context_list: &str) -> Vec<String> {
    let (current, others): (Vec<_>, Vec<_>) = context_list
        .lines()
        .filter_map(|line| line.split_once('\t'))
        .map(|(is_current, endpoint)| (is_current.trim() == "true", endpoint.trim()))
        .filter(|(_, endpoint)| !endpoint.is_empty())
        .partition(|(is_current, _)| *is_current);

    current
        .into_iter()
        .chain(others)
        .map(|(_, endpoint)| endpoint.to_string())
        .collect()
}

#[cfg(any(target_os = "macos", test))]
pub async fn forward_output_lines(
    mut events: tauri::async_runtime::Receiver<CommandEvent>,
    mut on_line: impl FnMut(&str),
) -> Result<(), String> {
    let mut stderr_lines = Vec::new();
    let mut read_error = None;

    while let Some(event) = events.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                if let Some(line) = printed_line(&bytes) {
                    on_line(&line);
                }
            }
            CommandEvent::Stderr(bytes) => {
                if let Some(line) = printed_line(&bytes) {
                    on_line(&line);
                    stderr_lines.push(line);
                }
            }
            CommandEvent::Error(error) => read_error = Some(error),
            CommandEvent::Terminated(payload) => {
                return exit_result(payload, stderr_lines.join("\n"));
            }
            _ => {}
        }
    }

    Err(read_error
        .unwrap_or_else(|| "The command ended without reporting how it exited".to_string()))
}

#[cfg(any(target_os = "macos", test))]
fn printed_line(bytes: &[u8]) -> Option<String> {
    let text = String::from_utf8_lossy(bytes);
    let line = text.trim_end_matches(['\n', '\r']);
    (!line.trim().is_empty()).then(|| line.to_string())
}

#[cfg(any(target_os = "macos", test))]
fn exit_result(payload: TerminatedPayload, stderr: String) -> Result<(), String> {
    match (payload.code, payload.signal) {
        (Some(0), _) => Ok(()),
        _ if !stderr.is_empty() => Err(stderr),
        (Some(code), _) => Err(format!("The command exited with code {code}")),
        (None, Some(signal)) => Err(format!("The command was killed by signal {signal}")),
        (None, None) => Err("The command ended without an exit code".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};
    use std::time::Duration;
    use tauri::async_runtime::{channel, Sender};

    const LINE_WAIT: Duration = Duration::from_secs(5);

    fn terminated(code: Option<i32>, signal: Option<i32>) -> CommandEvent {
        CommandEvent::Terminated(TerminatedPayload { code, signal })
    }

    async fn forward_all(events: Vec<CommandEvent>) -> (Result<(), String>, Vec<String>) {
        let (sender, receiver) = channel(events.len().max(1));
        for event in events {
            sender.send(event).await.unwrap();
        }
        drop(sender);

        let mut lines = Vec::new();
        let result = forward_output_lines(receiver, |line| lines.push(line.to_string())).await;
        (result, lines)
    }

    async fn send(sender: &Sender<CommandEvent>, event: CommandEvent) {
        sender.send(event).await.unwrap();
    }

    #[tokio::test]
    async fn forwards_each_line_before_the_command_exits() {
        let (sender, receiver) = channel(8);
        let lines = Arc::new(Mutex::new(Vec::<String>::new()));
        let seen = lines.clone();
        let forwarding = tokio::spawn(forward_output_lines(receiver, move |line| {
            seen.lock().unwrap().push(line.to_string())
        }));

        send(
            &sender,
            CommandEvent::Stdout(b"==> Downloading colima\n".to_vec()),
        )
        .await;
        tokio::time::timeout(LINE_WAIT, async {
            while lines.lock().unwrap().is_empty() {
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        })
        .await
        .expect("the line arrives while the command still runs");
        assert!(!forwarding.is_finished());

        send(&sender, terminated(Some(0), None)).await;

        assert_eq!(forwarding.await.unwrap(), Ok(()));
        assert_eq!(*lines.lock().unwrap(), ["==> Downloading colima"]);
    }

    #[tokio::test]
    async fn passes_stdout_and_stderr_lines_in_order_without_line_endings() {
        let (result, lines) = forward_all(vec![
            CommandEvent::Stdout(b"==> Pouring colima\n".to_vec()),
            CommandEvent::Stdout(b"\n".to_vec()),
            CommandEvent::Stderr(b"time=\"...\" level=info msg=\"starting colima\"\r".to_vec()),
            terminated(Some(0), None),
        ])
        .await;

        assert_eq!(result, Ok(()));
        assert_eq!(
            lines,
            [
                "==> Pouring colima",
                "time=\"...\" level=info msg=\"starting colima\"",
            ]
        );
    }

    #[tokio::test]
    async fn fails_with_the_stderr_text_when_the_command_exits_with_an_error() {
        let (result, lines) = forward_all(vec![
            CommandEvent::Stdout(b"==> Fetching colima\n".to_vec()),
            CommandEvent::Stderr(b"Error: No such keg\n".to_vec()),
            CommandEvent::Stderr(b"Error: Download failed\n".to_vec()),
            terminated(Some(1), None),
        ])
        .await;

        assert_eq!(
            result,
            Err("Error: No such keg\nError: Download failed".to_string())
        );
        assert_eq!(lines.len(), 3);
    }

    #[tokio::test]
    async fn fails_with_the_exit_code_when_the_command_printed_no_error() {
        let (result, _) = forward_all(vec![terminated(Some(2), None)]).await;

        assert_eq!(result, Err("The command exited with code 2".to_string()));
    }

    #[tokio::test]
    async fn fails_when_the_command_is_killed_by_a_signal() {
        let (result, _) = forward_all(vec![terminated(None, Some(9))]).await;

        assert_eq!(
            result,
            Err("The command was killed by signal 9".to_string())
        );
    }

    #[tokio::test]
    async fn keeps_reading_after_an_error_and_lets_the_exit_code_decide() {
        let (result, lines) = forward_all(vec![
            CommandEvent::Error("broken pipe".to_string()),
            CommandEvent::Stdout(b"==> Pouring colima\n".to_vec()),
            terminated(Some(0), None),
        ])
        .await;

        assert_eq!(result, Ok(()));
        assert_eq!(lines, ["==> Pouring colima"]);
    }

    #[tokio::test]
    async fn fails_with_the_exit_code_when_the_command_fails_after_an_error() {
        let (result, _) = forward_all(vec![
            CommandEvent::Error("broken pipe".to_string()),
            terminated(Some(1), None),
        ])
        .await;

        assert_eq!(result, Err("The command exited with code 1".to_string()));
    }

    #[tokio::test]
    async fn fails_with_the_error_when_the_command_ends_without_an_exit_status() {
        let (result, _) = forward_all(vec![CommandEvent::Error("broken pipe".to_string())]).await;

        assert_eq!(result, Err("broken pipe".to_string()));
    }

    #[tokio::test]
    async fn fails_when_the_command_ends_without_an_exit_status() {
        let (result, _) = forward_all(vec![CommandEvent::Stdout(b"==> Fetching\n".to_vec())]).await;

        assert!(result.is_err());
    }

    #[test]
    fn opens_the_shell_on_the_engine_nookat_shows_rather_than_the_current_context() {
        let args = docker_exec_args("tcp://127.0.0.1:23750", "1838a7db9b42", "sh");

        assert_eq!(
            args,
            [
                "--host",
                "tcp://127.0.0.1:23750",
                "exec",
                "-it",
                "1838a7db9b42",
                "sh"
            ]
        );
    }

    #[test]
    fn tries_the_current_context_before_the_others_like_the_docker_cli() {
        let context_list = "false\tunix:///var/run/docker.sock\n\
                            true\tunix:///Users/me/.colima/work/docker.sock\n\
                            false\tunix:///Users/me/.orbstack/run/docker.sock\n";

        assert_eq!(
            endpoints_with_the_current_context_first(context_list),
            [
                "unix:///Users/me/.colima/work/docker.sock",
                "unix:///var/run/docker.sock",
                "unix:///Users/me/.orbstack/run/docker.sock",
            ]
        );
    }

    #[test]
    fn keeps_the_listed_order_when_no_context_is_current() {
        let context_list = "false\tnpipe:////./pipe/docker_engine\n\
                            false\tnpipe:////./pipe/dockerDesktopLinuxEngine\n";

        assert_eq!(
            endpoints_with_the_current_context_first(context_list),
            [
                "npipe:////./pipe/docker_engine",
                "npipe:////./pipe/dockerDesktopLinuxEngine",
            ]
        );
    }

    #[test]
    fn skips_contexts_without_a_docker_endpoint_and_lines_it_cannot_read() {
        let context_list = "true\t\n\nnot a context line\nfalse\tunix:///var/run/docker.sock\n";

        assert_eq!(
            endpoints_with_the_current_context_first(context_list),
            ["unix:///var/run/docker.sock"]
        );
    }
}
