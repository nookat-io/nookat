# Task 1.2: Backend WebSocket Server

## Overview

Create a WebSocket server in the Rust backend using `tokio-tungstenite` to handle real-time communication with the frontend.

## Dependencies

- Task 1.1 completed (Plugin Installation and Configuration)

## Acceptance Criteria

- [ ] `tokio-tungstenite` dependency added to `Cargo.toml`
- [ ] WebSocket server module created (`src/services/websocket.rs`)
- [ ] WebSocket connection handling implemented
- [ ] Connection authentication and security added
- [ ] WebSocket event broadcasting system created
- [ ] Integration with existing Tauri command structure completed

## Implementation Steps

### Step 1.2.1: Add tokio-tungstenite Dependency

Add the WebSocket dependency to `Cargo.toml`:

```toml
[dependencies]
tokio-tungstenite = "0.21"
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

**Deliverables:**

- Dependency added to `Cargo.toml`
- Cargo.lock updated
- Dependencies resolve without conflicts

### Step 1.2.2: Create WebSocket Server Module

Create `src/services/websocket.rs` with basic server structure:

```rust
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, WebSocketStream};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebSocketMessage {
    pub message_type: String,
    pub payload: serde_json::Value,
    pub timestamp: u64,
}

pub struct WebSocketServer {
    connections: Arc<RwLock<HashMap<String, WebSocketStream<TcpStream>>>,
    port: u16,
}

impl WebSocketServer {
    pub fn new(port: u16) -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            port,
        }
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let addr = format!("127.0.0.1:{}", self.port);
        let listener = TcpListener::bind(&addr).await?;
        println!("WebSocket server listening on {}", addr);

        while let Ok((stream, _)) = listener.accept().await {
            let connections = self.connections.clone();
            tokio::spawn(async move {
                Self::handle_connection(stream, connections).await;
            });
        }

        Ok(())
    }

    async fn handle_connection(
        stream: TcpStream,
        connections: Arc<RwLock<HashMap<String, WebSocketStream<TcpStream>>>,
    ) {
        // Connection handling logic
    }
}
```

**Deliverables:**

- WebSocket server module created
- Basic server structure implemented
- Async runtime integration working

### Step 1.2.3: Implement WebSocket Connection Handling

Add connection management and message handling:

```rust
impl WebSocketServer {
    // ... existing code ...

    async fn handle_connection(
        stream: TcpStream,
        connections: Arc<RwLock<HashMap<String, WebSocketStream<TcpStream>>>,
    ) {
        let ws_stream = match accept_async(stream).await {
            Ok(ws) => ws,
            Err(e) => {
                eprintln!("Failed to accept WebSocket connection: {}", e);
                return;
            }
        };

        let connection_id = uuid::Uuid::new_v4().to_string();
        println!("New WebSocket connection: {}", connection_id);

        // Store connection
        {
            let mut conns = connections.write().await;
            conns.insert(connection_id.clone(), ws_stream);
        }

        // Handle messages
        Self::handle_messages(connection_id, connections).await;
    }

    async fn handle_messages(
        connection_id: String,
        connections: Arc<RwLock<HashMap<String, WebSocketStream<TcpStream>>>,
    ) {
        // Message handling logic
    }
}
```

**Deliverables:**

- Connection acceptance working
- Connection storage implemented
- Basic message handling structure

### Step 1.2.5: Create WebSocket Event Broadcasting System

Implement event broadcasting to all connected clients:

```rust
impl WebSocketServer {
    // ... existing code ...

    pub async fn broadcast_message(&self, message: WebSocketMessage) -> Result<(), Box<dyn std::error::Error>> {
        let connections = self.connections.read().await;
        let message_json = serde_json::to_string(&message)?;

        for (connection_id, mut ws_stream) in connections.iter() {
            if let Err(e) = ws_stream.send(tokio_tungstenite::tungstenite::Message::Text(message_json.clone())).await {
                eprintln!("Failed to send message to {}: {}", connection_id, e);
            }
        }

        Ok(())
    }

    pub async fn send_to_connection(
        &self,
        connection_id: &str,
        message: WebSocketMessage,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let connections = self.connections.read().await;
        if let Some(mut ws_stream) = connections.get(connection_id) {
            let message_json = serde_json::to_string(&message)?;
            ws_stream.send(tokio_tungstenite::tungstenite::Message::Text(message_json)).await?;
        }
        Ok(())
    }
}
```

**Deliverables:**

- Broadcast system implemented
- Individual message sending working
- Error handling for failed sends

### Step 1.2.6: Integrate with Existing Tauri Command Structure

Connect the WebSocket server to Tauri commands:

```rust
// In src/handlers/system/mod.rs or appropriate handler file
use crate::services::websocket::WebSocketServer;

#[tauri::command]
pub async fn start_websocket_server(port: u16) -> Result<(), String> {
    let server = WebSocketServer::new(port);
    server.start().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn broadcast_websocket_message(
    message_type: String,
    payload: serde_json::Value,
) -> Result<(), String> {
    // Get WebSocket server instance and broadcast message
    // This will need to be implemented based on your app structure
    Ok(())
}
```

**Deliverables:**

- Tauri commands created
- WebSocket server accessible from frontend
- Integration with existing command structure

## Technical Details

### Required Files Modified

- `Cargo.toml` - Add dependencies
- `src/services/websocket.rs` - New WebSocket server module
- Handler files - Add WebSocket commands
- Main application file - Initialize WebSocket server

### Architecture Considerations

- Async runtime integration
- Connection pooling and management
- Message serialization/deserialization
- Error handling and logging
- Security and authentication

### Performance Considerations

- Connection limit management
- Message queue implementation
- Memory usage optimization
- Concurrent connection handling

## Testing Checklist

- [ ] Dependencies resolve correctly
- [ ] WebSocket server starts without errors
- [ ] Connections are accepted and stored
- [ ] Messages can be sent and received
- [ ] Authentication system works
- [ ] Broadcasting functions correctly
- [ ] Tauri commands execute successfully
- [ ] Error handling works as expected

## Definition of Done

- [ ] All implementation steps completed
- [ ] WebSocket server runs without errors
- [ ] Connection handling works correctly
- [ ] Authentication and security implemented
- [ ] Broadcasting system functional
- [ ] Integration with Tauri completed
- [ ] Basic testing completed

## Notes

- Consider using connection pooling for better performance
- Implement proper error handling and logging
- Test with multiple concurrent connections
- Ensure proper cleanup of disconnected clients
- Monitor memory usage during development
