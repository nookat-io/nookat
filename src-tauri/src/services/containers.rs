use bollard::container::LogOutput;
use bollard::exec::{CreateExecOptions, StartExecResults};
use bollard::models::{ContainerStateStatusEnum, ContainerSummary};
use bollard::query_parameters::{
    ListContainersOptions, LogsOptions, PruneContainersOptions, RemoveContainerOptions,
    StartContainerOptions,
};
use bollard::Docker;
use futures_util::StreamExt;
use std::future::Future;
use tracing::instrument;

const INTERACTIVE_SHELLS: [&str; 2] = ["bash", "sh"];

#[derive(Default, Debug)]
pub struct ContainersService {}

impl ContainersService {
    #[instrument(skip_all, err)]
    pub async fn get_containers(docker: &Docker) -> Result<Vec<ContainerSummary>, String> {
        let options = ListContainersOptions {
            all: true,
            size: true,
            ..Default::default()
        };

        let containers = docker
            .list_containers(Some(options))
            .await
            .map_err(|e| format!("Failed to list containers: {}", e))?;

        Ok(containers.to_vec())
    }

    #[instrument(skip_all, err)]
    pub async fn start_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = StartContainerOptions::default();

        docker
            .start_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to start container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn stop_container(docker: &Docker, id: &str) -> Result<(), String> {
        docker
            .stop_container(id, None)
            .await
            .map_err(|e| format!("Failed to stop container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn pause_container(docker: &Docker, id: &str) -> Result<(), String> {
        docker
            .pause_container(id)
            .await
            .map_err(|e| format!("Failed to pause container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn unpause_container(docker: &Docker, id: &str) -> Result<(), String> {
        docker
            .unpause_container(id)
            .await
            .map_err(|e| format!("Failed to unpause container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn restart_container(docker: &Docker, id: &str) -> Result<(), String> {
        docker
            .restart_container(id, None)
            .await
            .map_err(|e| format!("Failed to restart container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn remove_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = RemoveContainerOptions {
            force: false,
            link: false,
            v: false,
        };

        docker
            .remove_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to remove container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn force_remove_container(docker: &Docker, id: &str) -> Result<(), String> {
        let options = RemoveContainerOptions {
            force: true,
            link: false,
            v: false,
        };

        docker
            .remove_container(id, Some(options))
            .await
            .map_err(|e| format!("Failed to force remove container: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn get_container_logs(
        docker: &Docker,
        id: &str,
        lines: u32,
    ) -> Result<Vec<String>, String> {
        let options = LogsOptions {
            stdout: true,
            stderr: true,
            tail: lines.to_string(),
            ..Default::default()
        };

        let mut log_stream = docker.logs(id, Some(options));
        let mut logs = Vec::new();

        while let Some(log_output) = log_stream.next().await {
            match log_output.map_err(|e| format!("Error reading log stream: {}", e))? {
                LogOutput::StdOut { message }
                | LogOutput::StdErr { message }
                | LogOutput::Console { message } => {
                    logs.push(
                        String::from_utf8_lossy(&message)
                            .trim_end_matches(['\r', '\n'])
                            .to_string(),
                    );
                }
                LogOutput::StdIn { .. } => {}
            }
        }

        Ok(logs)
    }

    #[instrument(skip_all, err)]
    pub async fn prune_containers(docker: &Docker) -> Result<(), String> {
        docker
            .prune_containers(None::<PruneContainersOptions>)
            .await
            .map_err(|e| format!("Failed to prune containers: {}", e))?;

        Ok(())
    }

    #[instrument(skip_all, err)]
    pub async fn running_container_id(docker: &Docker, id: &str) -> Result<String, String> {
        let container = docker
            .inspect_container(id, None)
            .await
            .map_err(|e| format!("Failed to inspect container: {}", e))?;

        let is_running = matches!(
            container.state.as_ref().and_then(|s| s.status),
            Some(ContainerStateStatusEnum::RUNNING)
        );
        if !is_running {
            return Err(format!("Container {} is not running", id));
        }

        container
            .id
            .ok_or_else(|| format!("Docker returned no ID for container {}", id))
    }

    #[instrument(skip_all, err)]
    pub async fn interactive_shell(docker: &Docker, id: &str) -> Result<&'static str, String> {
        first_shell_that_starts(|shell| Self::exits_cleanly(docker, id, [shell, "-c", "exit 0"]))
            .await?
            .ok_or_else(|| "The container has no shell, neither bash nor sh".to_string())
    }

    #[instrument(skip_all, err)]
    async fn exits_cleanly(docker: &Docker, id: &str, cmd: [&str; 3]) -> Result<bool, String> {
        let program = cmd[0];
        let exec = docker
            .create_exec(
                id,
                CreateExecOptions {
                    cmd: Some(cmd.to_vec()),
                    attach_stdout: Some(true),
                    attach_stderr: Some(true),
                    ..Default::default()
                },
            )
            .await
            .map_err(|e| format!("Failed to prepare {} in the container: {}", program, e))?;

        let started = docker
            .start_exec(&exec.id, None)
            .await
            .map_err(|e| format!("Failed to run {} in the container: {}", program, e))?;
        if let StartExecResults::Attached { mut output, .. } = started {
            while output.next().await.is_some() {}
        }

        let finished = docker
            .inspect_exec(&exec.id)
            .await
            .map_err(|e| format!("Failed to read how {} exited: {}", program, e))?;

        Ok(finished.exit_code == Some(0))
    }
}

async fn first_shell_that_starts<Starts, Started>(
    mut starts: Starts,
) -> Result<Option<&'static str>, String>
where
    Starts: FnMut(&'static str) -> Started,
    Started: Future<Output = Result<bool, String>>,
{
    for shell in INTERACTIVE_SHELLS {
        if starts(shell).await? {
            return Ok(Some(shell));
        }
    }

    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn opens_bash_when_the_container_has_it() {
        let shell = first_shell_that_starts(|_| async { Ok(true) }).await;

        assert_eq!(shell, Ok(Some("bash")));
    }

    #[tokio::test]
    async fn falls_back_to_sh_when_bash_does_not_start() {
        let shell = first_shell_that_starts(|shell| async move { Ok(shell == "sh") }).await;

        assert_eq!(shell, Ok(Some("sh")));
    }

    #[tokio::test]
    async fn finds_no_shell_when_neither_bash_nor_sh_starts() {
        let shell = first_shell_that_starts(|_| async { Ok(false) }).await;

        assert_eq!(shell, Ok(None));
    }

    #[tokio::test]
    async fn reports_an_engine_error_instead_of_trying_the_next_shell() {
        let mut tried = Vec::new();

        let shell = first_shell_that_starts(|shell| {
            tried.push(shell);
            async { Err("The engine stopped answering".to_string()) }
        })
        .await;

        assert_eq!(shell, Err("The engine stopped answering".to_string()));
        assert_eq!(tried, ["bash"]);
    }

    #[cfg(unix)]
    mod against_a_fake_daemon {
        use super::*;
        use crate::services::fake_docker_daemon::{
            http_response, request_lines, serve_daemon, RecordedRequests,
        };
        use tempfile::TempDir;

        const MULTIPLEXED_STREAM: &str = "application/vnd.docker.multiplexed-stream";
        const RAW_STREAM: &str = "application/vnd.docker.raw-stream";

        fn daemon_answering(response: String) -> (TempDir, Docker, RecordedRequests) {
            let dir = tempfile::tempdir().unwrap();
            let socket = dir.path().join("docker.sock");
            let requests = serve_daemon(&socket, move |_| response.clone());
            let docker = Docker::connect_with_unix(
                socket.to_str().unwrap(),
                5,
                bollard::API_DEFAULT_VERSION,
            )
            .unwrap();
            (dir, docker, requests)
        }

        fn daemon_answering_no_content() -> (TempDir, Docker, RecordedRequests) {
            daemon_answering(http_response("204 No Content", "text/plain", ""))
        }

        fn daemon_answering_logs(
            content_type: &str,
            body: &str,
        ) -> (TempDir, Docker, RecordedRequests) {
            daemon_answering(http_response("200 OK", content_type, body))
        }

        fn lines_of_the_web_log() -> Result<Vec<String>, String> {
            Ok(vec!["booting".to_string(), "listening on :80".to_string()])
        }

        #[tokio::test]
        async fn logs_ask_the_daemon_for_the_last_lines_only() {
            let (_dir, docker, requests) = daemon_answering_logs(MULTIPLEXED_STREAM, "");

            ContainersService::get_container_logs(&docker, "web", 1000)
                .await
                .unwrap();

            let line = the_only_request_line(&requests);
            assert!(line.contains("/containers/web/logs?"), "{line}");
            assert!(line.contains("tail=1000"), "{line}");
            assert!(!line.contains("tail=all"), "{line}");
        }

        #[tokio::test]
        async fn logs_return_each_line_without_its_line_break() {
            let (_dir, docker, _requests) = daemon_answering_logs(
                MULTIPLEXED_STREAM,
                "\u{1}\u{0}\u{0}\u{0}\u{0}\u{0}\u{0}\u{8}booting\n\u{2}\u{0}\u{0}\u{0}\u{0}\u{0}\u{0}\u{11}listening on :80\n",
            );

            let logs = ContainersService::get_container_logs(&docker, "web", 1000).await;

            assert_eq!(logs, lines_of_the_web_log());
        }

        #[tokio::test]
        async fn logs_of_a_tty_container_return_each_line_without_its_line_break() {
            let (_dir, docker, _requests) =
                daemon_answering_logs(RAW_STREAM, "booting\r\nlistening on :80\r\n");

            let logs = ContainersService::get_container_logs(&docker, "web", 1000).await;

            assert_eq!(logs, lines_of_the_web_log());
        }

        #[tokio::test]
        async fn logs_of_a_container_with_no_output_are_empty() {
            let (_dir, docker, _requests) = daemon_answering_logs(MULTIPLEXED_STREAM, "");

            let logs = ContainersService::get_container_logs(&docker, "web", 1000).await;

            assert_eq!(logs, Ok(vec![]));
        }

        fn the_only_request_line(requests: &RecordedRequests) -> String {
            let lines = request_lines(requests);
            assert_eq!(lines.len(), 1, "{lines:?}");
            lines[0].clone()
        }

        #[tokio::test]
        async fn stop_lets_the_daemon_apply_the_container_stop_timeout() {
            let (_dir, docker, requests) = daemon_answering_no_content();

            ContainersService::stop_container(&docker, "web")
                .await
                .unwrap();

            let line = the_only_request_line(&requests);
            assert!(line.contains("/containers/web/stop"), "{line}");
            assert!(!line.contains("t="), "{line}");
        }

        #[tokio::test]
        async fn restart_lets_the_daemon_apply_the_container_stop_timeout() {
            let (_dir, docker, requests) = daemon_answering_no_content();

            ContainersService::restart_container(&docker, "web")
                .await
                .unwrap();

            let line = the_only_request_line(&requests);
            assert!(line.contains("/containers/web/restart"), "{line}");
            assert!(!line.contains("t="), "{line}");
        }
    }
}
