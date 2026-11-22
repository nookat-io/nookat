use bollard::Docker;
use std::path::Path;
use tracing::instrument;

const CONNECT_TIMEOUT_SECONDS: u64 = 5;

#[instrument(skip_all, err(level = "debug"))]
pub async fn docker_responds_on(socket: &Path) -> Result<(), String> {
    let socket_path = socket
        .to_str()
        .ok_or_else(|| format!("{:?} is not a valid socket path", socket))?;
    let docker = Docker::connect_with_unix(
        socket_path,
        CONNECT_TIMEOUT_SECONDS,
        bollard::API_DEFAULT_VERSION,
    )
    .map_err(|e| format!("Failed to connect to {}: {}", socket_path, e))?;

    docker
        .ping()
        .await
        .map_err(|e| format!("Docker on {} does not answer: {}", socket_path, e))?;
    docker
        .info()
        .await
        .map_err(|e| format!("Docker on {} is not ready: {}", socket_path, e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::fake_docker_daemon::http_response;

    fn serve_daemon(socket: &Path, info_status: &'static str) {
        crate::services::fake_docker_daemon::serve_daemon(socket, move |request| {
            if request.contains("/_ping") {
                http_response("200 OK", "text/plain", "OK")
            } else {
                http_response(info_status, "application/json", "{}")
            }
        });
    }

    #[tokio::test]
    async fn answers_once_the_daemon_serves_ping_and_info() {
        let dir = tempfile::tempdir().unwrap();
        let socket = dir.path().join("docker.sock");
        serve_daemon(&socket, "200 OK");

        assert_eq!(docker_responds_on(&socket).await, Ok(()));
    }

    #[tokio::test]
    async fn a_daemon_that_cannot_report_its_info_is_not_ready() {
        let dir = tempfile::tempdir().unwrap();
        let socket = dir.path().join("docker.sock");
        serve_daemon(&socket, "500 Internal Server Error");

        let error = docker_responds_on(&socket).await.expect_err("must fail");

        assert!(error.contains("is not ready"), "{error}");
    }

    #[tokio::test]
    async fn a_socket_nobody_listens_on_does_not_answer() {
        let dir = tempfile::tempdir().unwrap();
        let socket = dir.path().join("docker.sock");

        let error = docker_responds_on(&socket).await.expect_err("must fail");

        assert!(error.contains(socket.to_str().unwrap()), "{error}");
    }
}
