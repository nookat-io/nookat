use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::RwLock;
use tokio_tungstenite::{accept_async, tungstenite::Message, WebSocketStream};
use tracing::{error, info};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketMessage {
    pub message_type: String,
    pub payload: serde_json::Value,
    pub timestamp: u64,
}

// New engine state update message type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineStateUpdateMessage {
    pub message_type: String,
    pub payload: serde_json::Value,
    pub timestamp: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthMessage {
    pub token: String,
    pub timestamp: u64,
}

pub struct WebSocketServer {
    pub connections: Arc<RwLock<HashMap<String, WebSocketStream<TcpStream>>>>,
    port: u16,
    is_running: Arc<RwLock<bool>>,
}

impl WebSocketServer {
    pub fn new(port: u16) -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            port,
            is_running: Arc::new(RwLock::new(false)),
        }
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Check if server is already running
        {
            let mut running = self.is_running.write().await;
            if *running {
                info!("WebSocket server already running on port {}", self.port);
                return Ok(());
            }
            *running = true;
        }

        let addr = format!("127.0.0.1:{}", self.port);
        let listener = TcpListener::bind(&addr).await?;
        info!("WebSocket server listening on {}", addr);

        while let Ok((stream, _)) = listener.accept().await {
            let connections = self.connections.clone();
            tokio::spawn(async move {
                Self::handle_connection(stream, connections).await;
            });
        }

        // Reset running state when server stops
        {
            let mut running = self.is_running.write().await;
            *running = false;
        }

        Ok(())
    }

    pub async fn is_server_running(&self) -> bool {
        *self.is_running.read().await
    }

    pub async fn stop_server(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut running = self.is_running.write().await;
        *running = false;

        // Clear all connections
        let mut connections = self.connections.write().await;
        connections.clear();

        info!("WebSocket server stopped on port {}", self.port);
        Ok(())
    }

    async fn handle_connection(
        stream: TcpStream,
        connections: Arc<RwLock<HashMap<String, WebSocketStream<TcpStream>>>>,
    ) {
        let ws_stream = match accept_async(stream).await {
            Ok(ws) => ws,
            Err(e) => {
                error!("Failed to accept WebSocket connection: {}", e);
                return;
            }
        };

        let connection_id = uuid::Uuid::new_v4().to_string();
        info!("New WebSocket connection: {}", connection_id);

        // Store connection
        {
            let mut conns = connections.write().await;
            conns.insert(connection_id.clone(), ws_stream);
        }

        // Handle messages
        Self::handle_messages(connection_id, connections).await;
    }

    async fn authenticate_connection(
        _message: &WebSocketMessage,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        // Implement authentication logic
        // Verify token, check timestamp, etc.
        // For now, return true as placeholder
        Ok(true)
    }

    async fn validate_message(&self, _message: &WebSocketMessage) -> bool {
        // Message validation logic
        // Check message size, rate limiting, etc.
        // For now, return true as placeholder
        true
    }

    async fn handle_messages(
        connection_id: String,
        connections: Arc<RwLock<HashMap<String, WebSocketStream<TcpStream>>>>,
    ) {
        let ws_stream = {
            let mut conns = connections.write().await;
            if let Some(ws) = conns.remove(&connection_id) {
                ws
            } else {
                return;
            }
        };

        // Split the stream into sender and receiver
        let (mut write, mut read) = ws_stream.split();

        // Handle incoming messages
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    // Echo the message back for testing
                    if let Err(e) = write.send(Message::Text(text)).await {
                        error!("Failed to echo message to {}: {}", connection_id, e);
                        break;
                    }
                }
                Ok(Message::Close(_)) => {
                    info!("WebSocket connection {} closed by client", connection_id);
                    break;
                }
                Ok(_) => {
                    // Ignore other message types for now
                }
                Err(e) => {
                    error!("WebSocket error for {}: {}", connection_id, e);
                    break;
                }
            }
        }

        // Remove the connection when the loop ends
        let mut conns = connections.write().await;
        conns.remove(&connection_id);
        info!("WebSocket connection {} removed", connection_id);
    }

    // New method to broadcast messages to all connected clients
    pub async fn broadcast_message(
        &self,
        message: &str,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let message_clone = message.to_string();
        let connections = self.connections.clone();

        // Get a snapshot of connection IDs to avoid holding the lock during iteration
        let connection_ids: Vec<String> = {
            let conns = connections.read().await;
            conns.keys().cloned().collect()
        };

        // Send message to each connection
        for connection_id in connection_ids {
            let message_clone = message_clone.clone();
            let connections = connections.clone();

            tokio::spawn(async move {
                // Get a write lock for this specific connection
                let mut conns = connections.write().await;
                if let Some(stream) = conns.get_mut(&connection_id) {
                    if let Err(e) = stream.send(Message::Text(message_clone)).await {
                        error!(
                            "Failed to send message to connection {}: {}",
                            connection_id, e
                        );
                    }
                }
            });
        }

        Ok(())
    }

    pub async fn send_to_connection(
        &self,
        connection_id: &str,
        message: WebSocketMessage,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut connections = self.connections.write().await;
        if let Some(ws_stream) = connections.get_mut(connection_id) {
            let message_json = serde_json::to_string(&message)?;
            ws_stream.send(Message::Text(message_json)).await?;
        }
        Ok(())
    }

    pub async fn start_timestamp_service(
        &self,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let connections = self.connections.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(1));

            loop {
                interval.tick().await;

                let timestamp = chrono::Utc::now().timestamp();
                let message = WebSocketMessage {
                    message_type: "timestamp".to_string(),
                    payload: serde_json::json!({
                        "timestamp": timestamp,
                        "formatted": chrono::Utc::now().to_rfc3339()
                    }),
                    timestamp: timestamp as u64,
                };

                let mut conns = connections.write().await;
                let message_json = match serde_json::to_string(&message) {
                    Ok(json) => json,
                    Err(e) => {
                        error!("Failed to serialize timestamp message: {}", e);
                        continue;
                    }
                };

                // Send to all connected clients
                for (connection_id, ws_stream) in conns.iter_mut() {
                    if let Err(e) = ws_stream.send(Message::Text(message_json.clone())).await {
                        error!("Failed to send timestamp to {}: {}", connection_id, e);
                    }
                }
            }
        });

        Ok(())
    }
}

// Global WebSocket server manager
pub struct WebSocketManager {
    server: Arc<RwLock<Option<WebSocketServer>>>,
}

impl WebSocketManager {
    pub fn new() -> Self {
        Self {
            server: Arc::new(RwLock::new(None)),
        }
    }

    // New method to broadcast engine state updates
    pub async fn broadcast_engine_state_update(
        &self,
        engine_state: serde_json::Value,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let server_guard = self.server.read().await;

        if let Some(server) = server_guard.as_ref() {
            let message = EngineStateUpdateMessage {
                message_type: "engine_state_update".to_string(),
                payload: engine_state,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis() as u64,
            };

            // Convert to JSON and broadcast
            let json_message = serde_json::to_string(&message)?;
            server.broadcast_message(&json_message).await?;
        }

        Ok(())
    }

    pub async fn start_server(
        &self,
        port: u16,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut server_guard = self.server.write().await;

        // Check if server already exists and is running
        if let Some(server) = server_guard.as_ref() {
            if server.is_server_running().await {
                info!("WebSocket server already running on port {}", port);
                return Ok(());
            }
        }

        // Create new server instance
        let server = WebSocketServer::new(port);

        // Start the timestamp service
        server.start_timestamp_service().await?;

        // Start the server in a separate task
        let server_clone = server.clone();
        tokio::spawn(async move {
            if let Err(e) = server_clone.start().await {
                error!("WebSocket server error: {}", e);
            }
        });

        *server_guard = Some(server);
        info!("WebSocket server started on port {}", port);

        Ok(())
    }

    pub async fn stop_server(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let mut server_guard = self.server.write().await;

        if let Some(server) = server_guard.as_ref() {
            server.stop_server().await?;
        }

        *server_guard = None;
        Ok(())
    }

    pub async fn is_server_running(&self) -> bool {
        let server_guard = self.server.read().await;

        if let Some(server) = server_guard.as_ref() {
            server.is_server_running().await
        } else {
            false
        }
    }

    pub async fn get_server(&self) -> Option<WebSocketServer> {
        let server_guard = self.server.read().await;
        server_guard.clone()
    }
}

impl Clone for WebSocketManager {
    fn clone(&self) -> Self {
        Self {
            server: self.server.clone(),
        }
    }
}

impl Clone for WebSocketServer {
    fn clone(&self) -> Self {
        Self {
            connections: self.connections.clone(),
            port: self.port,
            is_running: self.is_running.clone(),
        }
    }
}
