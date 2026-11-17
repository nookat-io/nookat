use super::ReleaseArtifact;
use reqwest::StatusCode;
use sha2::{Digest, Sha256};
use std::path::Path;
use std::time::Duration;
use tokio::io::AsyncWriteExt;
use tracing::warn;

const DOWNLOAD_ATTEMPTS: u32 = 3;
const RETRY_BACKOFF: Duration = Duration::from_secs(2);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(30);
const READ_TIMEOUT: Duration = Duration::from_secs(60);

enum DownloadFailure {
    Retryable(String),
    Fatal(String),
}

#[derive(Clone)]
pub struct Downloader {
    client: reqwest::Client,
    attempts: u32,
    retry_backoff: Duration,
}

impl Downloader {
    pub fn new() -> Result<Self, String> {
        Self::with_retry_backoff(RETRY_BACKOFF)
    }

    pub fn with_retry_backoff(retry_backoff: Duration) -> Result<Self, String> {
        let client = reqwest::Client::builder()
            .user_agent(concat!("Nookat/", env!("CARGO_PKG_VERSION")))
            .connect_timeout(CONNECT_TIMEOUT)
            .read_timeout(READ_TIMEOUT)
            .build()
            .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

        Ok(Downloader {
            client,
            attempts: DOWNLOAD_ATTEMPTS,
            retry_backoff,
        })
    }

    pub async fn download_verified(
        &self,
        artifact: &ReleaseArtifact,
        destination: &Path,
        on_progress: &mut impl FnMut(u64, u64),
    ) -> Result<(), String> {
        let mut attempt = 1;
        let digest = loop {
            match self.download_once(artifact, destination, on_progress).await {
                Ok(digest) => break digest,
                Err(DownloadFailure::Fatal(e)) => return Err(e),
                Err(DownloadFailure::Retryable(e)) if attempt >= self.attempts => {
                    return Err(format!(
                        "Failed to download {} {} after {} attempts: {}",
                        artifact.name, artifact.version, self.attempts, e
                    ));
                }
                Err(DownloadFailure::Retryable(e)) => {
                    warn!(
                        "Download of {} failed on attempt {}, retrying: {}",
                        artifact.url, attempt, e
                    );
                    tokio::time::sleep(self.retry_backoff * attempt).await;
                    attempt += 1;
                }
            }
        };

        verify_sha256(artifact, &digest)
    }

    async fn download_once(
        &self,
        artifact: &ReleaseArtifact,
        destination: &Path,
        on_progress: &mut impl FnMut(u64, u64),
    ) -> Result<String, DownloadFailure> {
        let mut response = self
            .client
            .get(artifact.url.as_ref())
            .send()
            .await
            .map_err(|e| DownloadFailure::Retryable(e.to_string()))?;

        let status = response.status();
        if !status.is_success() {
            let message = format!("{} answered HTTP {}", artifact.url, status);
            return Err(if is_retryable_status(status) {
                DownloadFailure::Retryable(message)
            } else {
                DownloadFailure::Fatal(message)
            });
        }

        let total = response.content_length().unwrap_or(artifact.download_bytes);
        let write_failure = |e: std::io::Error| {
            DownloadFailure::Fatal(format!("Failed to write {:?}: {}", destination, e))
        };
        let mut file = tokio::fs::File::create(destination)
            .await
            .map_err(write_failure)?;
        let mut hasher = Sha256::new();
        let mut received = 0u64;

        while let Some(chunk) = response
            .chunk()
            .await
            .map_err(|e| DownloadFailure::Retryable(e.to_string()))?
        {
            file.write_all(&chunk).await.map_err(write_failure)?;
            hasher.update(&chunk);
            received += chunk.len() as u64;
            on_progress(received, total.max(received));
        }

        file.flush().await.map_err(write_failure)?;

        Ok(format!("{:x}", hasher.finalize()))
    }
}

pub fn verify_sha256(artifact: &ReleaseArtifact, actual_sha256: &str) -> Result<(), String> {
    if actual_sha256 == artifact.sha256 {
        return Ok(());
    }

    Err(format!(
        "{} {} from {} does not match its pinned SHA-256 digest (expected {}, got {}), so nothing was installed",
        artifact.name, artifact.version, artifact.url, artifact.sha256, actual_sha256
    ))
}

fn is_retryable_status(status: StatusCode) -> bool {
    status.is_server_error()
        || status == StatusCode::REQUEST_TIMEOUT
        || status == StatusCode::TOO_MANY_REQUESTS
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::binary_install::ArtifactLayout;
    use std::borrow::Cow;

    fn artifact(sha256: &str) -> ReleaseArtifact {
        ReleaseArtifact {
            name: "Colima",
            version: "0.10.3",
            url: Cow::Borrowed("https://example.invalid/colima"),
            sha256: Cow::Owned(sha256.to_string()),
            download_bytes: 1,
            unpacked_bytes: 1,
            layout: ArtifactLayout::Executable {
                install_as: "colima",
            },
            check_command: "colima",
        }
    }

    #[test]
    fn accepts_a_download_with_the_pinned_digest() {
        assert_eq!(verify_sha256(&artifact("abc"), "abc"), Ok(()));
    }

    #[test]
    fn rejects_a_download_with_another_digest_and_names_both() {
        let error = verify_sha256(&artifact("abc"), "def").expect_err("must fail");

        assert!(error.contains("expected abc, got def"), "{error}");
        assert!(error.contains("nothing was installed"), "{error}");
    }

    #[test]
    fn retries_server_errors_and_rate_limits_but_not_missing_files() {
        assert!(is_retryable_status(StatusCode::BAD_GATEWAY));
        assert!(is_retryable_status(StatusCode::TOO_MANY_REQUESTS));
        assert!(!is_retryable_status(StatusCode::NOT_FOUND));
        assert!(!is_retryable_status(StatusCode::FORBIDDEN));
    }
}
