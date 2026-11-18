use flate2::write::GzEncoder;
use flate2::Compression;
use std::collections::HashMap;
use std::fs::File;
use std::path::Path;
use std::sync::{Arc, Mutex};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;

pub enum FixtureKind {
    File { contents: Vec<u8>, mode: u32 },
    Symlink { target: &'static str },
}

pub struct Fixture {
    path: &'static str,
    kind: FixtureKind,
}

impl Fixture {
    pub fn file(path: &'static str, contents: &[u8]) -> Self {
        Fixture {
            path,
            kind: FixtureKind::File {
                contents: contents.to_vec(),
                mode: 0o644,
            },
        }
    }

    pub fn executable(path: &'static str, contents: &[u8]) -> Self {
        Fixture {
            path,
            kind: FixtureKind::File {
                contents: contents.to_vec(),
                mode: 0o755,
            },
        }
    }

    pub fn symlink(path: &'static str, target: &'static str) -> Self {
        Fixture {
            path,
            kind: FixtureKind::Symlink { target },
        }
    }
}

pub fn tar_gz(destination: &Path, fixtures: &[Fixture]) {
    let encoder = GzEncoder::new(File::create(destination).unwrap(), Compression::fast());
    let mut builder = tar::Builder::new(encoder);

    for fixture in fixtures {
        let mut header = tar::Header::new_gnu();
        match &fixture.kind {
            FixtureKind::File { contents, mode } => {
                header.set_entry_type(tar::EntryType::Regular);
                header.set_size(contents.len() as u64);
                header.set_mode(*mode);
                builder
                    .append_data(&mut header, fixture.path, contents.as_slice())
                    .unwrap();
            }
            FixtureKind::Symlink { target } => {
                header.set_entry_type(tar::EntryType::Symlink);
                header.set_size(0);
                header.set_mode(0o755);
                builder
                    .append_link(&mut header, fixture.path, target)
                    .unwrap();
            }
        }
    }

    builder.into_inner().unwrap().finish().unwrap();
}

#[derive(Clone, Default)]
pub struct FileServer {
    files: Arc<Mutex<HashMap<String, Vec<u8>>>>,
    failures_before_success: Arc<Mutex<HashMap<String, u32>>>,
    requests: Arc<Mutex<Vec<String>>>,
}

impl FileServer {
    pub fn serve(&self, path: &str, contents: Vec<u8>) {
        self.files
            .lock()
            .unwrap()
            .insert(path.to_string(), contents);
    }

    pub fn fail_first_requests(&self, path: &str, failures: u32) {
        self.failures_before_success
            .lock()
            .unwrap()
            .insert(path.to_string(), failures);
    }

    pub fn requests(&self) -> Vec<String> {
        self.requests.lock().unwrap().clone()
    }

    pub async fn start(&self) -> String {
        let listener = TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = self.clone();

        tokio::spawn(async move {
            loop {
                let Ok((mut stream, _)) = listener.accept().await else {
                    return;
                };
                let server = server.clone();
                tokio::spawn(async move {
                    let mut request = vec![0u8; 4096];
                    let read = stream.read(&mut request).await.unwrap_or(0);
                    let request = String::from_utf8_lossy(&request[..read]).to_string();
                    let path = request.split_whitespace().nth(1).unwrap_or("/").to_string();
                    let response = server.respond(&path);
                    let _ = stream.write_all(&response).await;
                    let _ = stream.shutdown().await;
                });
            }
        });

        format!("http://{address}")
    }

    fn respond(&self, path: &str) -> Vec<u8> {
        self.requests.lock().unwrap().push(path.to_string());

        let mut failures = self.failures_before_success.lock().unwrap();
        if let Some(remaining) = failures.get_mut(path).filter(|remaining| **remaining > 0) {
            *remaining -= 1;
            return http_response("503 Service Unavailable", b"try again");
        }

        match self.files.lock().unwrap().get(path) {
            Some(contents) => http_response("200 OK", contents),
            None => http_response("404 Not Found", b"missing"),
        }
    }
}

fn http_response(status: &str, body: &[u8]) -> Vec<u8> {
    let mut response = format!(
        "HTTP/1.1 {status}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    )
    .into_bytes();
    response.extend_from_slice(body);
    response
}
