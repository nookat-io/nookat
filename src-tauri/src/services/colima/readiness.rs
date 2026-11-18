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
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::UnixListener;

    fn http_response(status: &str, content_type: &str, body: &str) -> String {
        format!(
            "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        )
    }

    fn serve_daemon(socket: &Path, info_status: &'static str) {
        let listener = UnixListener::bind(socket).unwrap();
        tokio::spawn(async move {
            while let Ok((mut stream, _)) = listener.accept().await {
                tokio::spawn(async move {
                    let mut request = vec![0u8; 4096];
                    let read = stream.read(&mut request).await.unwrap_or(0);
                    let request = String::from_utf8_lossy(&request[..read]).to_string();
                    let response = if request.contains("/_ping") {
                        http_response("200 OK", "text/plain", "OK")
                    } else {
                        http_response(info_status, "application/json", "{}")
                    };
                    let _ = stream.write_all(response.as_bytes()).await;
                    let _ = stream.shutdown().await;
                });
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
