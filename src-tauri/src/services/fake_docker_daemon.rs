use std::path::Path;
use std::sync::{Arc, Mutex};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::UnixListener;

pub type RecordedRequests = Arc<Mutex<Vec<String>>>;

pub fn http_response(status: &str, content_type: &str, body: &str) -> String {
    format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    )
}

pub fn serve_daemon<Respond>(socket: &Path, respond: Respond) -> RecordedRequests
where
    Respond: Fn(&str) -> String + Send + Sync + 'static,
{
    let listener = UnixListener::bind(socket).unwrap();
    let respond = Arc::new(respond);
    let requests = RecordedRequests::default();
    let recorded = requests.clone();
    tokio::spawn(async move {
        while let Ok((mut stream, _)) = listener.accept().await {
            let respond = respond.clone();
            let recorded = recorded.clone();
            tokio::spawn(async move {
                let mut request = vec![0u8; 4096];
                let read = stream.read(&mut request).await.unwrap_or(0);
                let request = String::from_utf8_lossy(&request[..read]).to_string();
                let response = respond(&request);
                recorded.lock().unwrap().push(request);
                let _ = stream.write_all(response.as_bytes()).await;
                let _ = stream.shutdown().await;
            });
        }
    });
    requests
}

pub fn request_lines(requests: &RecordedRequests) -> Vec<String> {
    requests
        .lock()
        .unwrap()
        .iter()
        .filter_map(|request| request.lines().next().map(str::to_string))
        .collect()
}
