# Task 1.3: Docker Event Monitoring

## Overview

Create a Docker event monitoring service using `docker-rs` to subscribe to Docker events and forward them to the WebSocket broadcasting system.

## Dependencies

- Task 1.1 completed (Plugin Installation and Configuration)
- Task 1.2 completed (Backend WebSocket Server)

## Acceptance Criteria

- [ ] `docker-rs` dependency added to `Cargo.toml`
- [ ] Docker event monitoring service created (`src/services/docker_events.rs`)
- [ ] Docker event subscription implemented
- [ ] Event filtering and processing created
- [ ] Docker events connected to WebSocket broadcasting
- [ ] Error handling for Docker API failures implemented

## Implementation Steps

### Step 1.3.1: Add docker-rs Dependency

Add the Docker API client dependency to `Cargo.toml`:

```toml
[dependencies]
docker-rs = "0.3"
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

**Deliverables:**

- Dependency added to `Cargo.toml`
- Cargo.lock updated
- Dependencies resolve without conflicts

### Step 1.3.2: Create Docker Event Monitoring Service

Create `src/services/docker_events.rs` with event monitoring structure:

```rust
use docker_rs::{Docker, DockerApi};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{Duration, interval};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerEvent {
    pub event_type: String,
    pub action: String,
    pub actor: DockerActor,
    pub scope: String,
    pub time: u64,
    pub time_nano: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerActor {
    pub id: String,
    pub attributes: HashMap<String, String>,
}

pub struct DockerEventMonitor {
    docker: Docker,
    websocket_server: Arc<RwLock<Option<WebSocketServer>>>,
    event_filters: Vec<String>,
    is_running: Arc<RwLock<bool>>,
}

impl DockerEventMonitor {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let docker = Docker::new()?;

        Ok(Self {
            docker,
            websocket_server: Arc::new(RwLock::new(None)),
            event_filters: vec![],
            is_running: Arc::new(RwLock::new(false)),
        })
    }

    pub fn set_websocket_server(&mut self, server: WebSocketServer) {
        let server_arc = Arc::new(RwLock::new(Some(server)));
        self.websocket_server = server_arc;
    }

    pub fn add_event_filter(&mut self, filter: String) {
        self.event_filters.push(filter);
    }
}
```

**Deliverables:**

- Docker event monitoring service created
- Basic structure implemented
- Docker client integration working

### Step 1.3.3: Implement Docker Event Subscription

Add event subscription and streaming functionality:

```rust
impl DockerEventMonitor {
    // ... existing code ...

    pub async fn start_monitoring(&self) -> Result<(), Box<dyn std::error::Error>> {
        let is_running = self.is_running.clone();
        let websocket_server = self.websocket_server.clone();
        let event_filters = self.event_filters.clone();

        {
            let mut running = is_running.write().await;
            *running = true;
        }

        let docker = self.docker.clone();

        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(1));

            while *is_running.read().await {
                interval.tick().await;

                if let Err(e) = Self::poll_docker_events(&docker, &websocket_server, &event_filters).await {
                    eprintln!("Error polling Docker events: {}", e);
                }
            }
        });

        Ok(())
    }

    async fn poll_docker_events(
        docker: &Docker,
        websocket_server: &Arc<RwLock<Option<WebSocketServer>>>,
        event_filters: &[String],
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Poll Docker events and process them
        // This is a simplified approach - in production you'd use event streaming

        let events = Self::get_recent_events(docker).await?;

        for event in events {
            if Self::should_process_event(&event, event_filters) {
                if let Some(server) = websocket_server.read().await.as_ref() {
                    let message = WebSocketMessage {
                        message_type: "docker_event".to_string(),
                        payload: serde_json::to_value(event)?,
                        timestamp: std::time::SystemTime::now()
                            .duration_since(std::time::UNIX_EPOCH)?
                            .as_secs(),
                    };

                    server.broadcast_message(message).await?;
                }
            }
        }

        Ok(())
    }
}
```

**Deliverables:**

- Event subscription system working
- Event polling implemented
- Basic event processing functional

### Step 1.3.4: Create Event Filtering and Processing

Implement event filtering and processing logic:

```rust
impl DockerEventMonitor {
    // ... existing code ...

    async fn get_recent_events(docker: &Docker) -> Result<Vec<DockerEvent>, Box<dyn std::error::Error>> {
        // Get recent events from Docker API
        // This is a placeholder - implement actual Docker API calls

        let mut events = Vec::new();

        // Example: Get container events
        if let Ok(containers) = docker.containers().list(&Default::default()).await {
            for container in containers {
                // Process container information and create events
                // This would need to be implemented based on actual Docker API usage
            }
        }

        Ok(events)
    }

    fn should_process_event(event: &DockerEvent, filters: &[String]) -> bool {
        if filters.is_empty() {
            return true;
        }

        for filter in filters {
            if event.event_type.contains(filter) || event.action.contains(filter) {
                return true;
            }
        }

        false
    }

    pub fn process_event(&self, event: DockerEvent) -> Option<WebSocketMessage> {
        // Process and transform Docker events into WebSocket messages
        let message_type = match event.event_type.as_str() {
            "container" => "container_event",
            "image" => "image_event",
            "volume" => "volume_event",
            "network" => "network_event",
            _ => "docker_event",
        };

        Some(WebSocketMessage {
            message_type: message_type.to_string(),
            payload: serde_json::to_value(event).ok()?,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .ok()?
                .as_secs(),
        })
    }
}
```

**Deliverables:**

- Event filtering system implemented
- Event processing logic working
- Message transformation functional

### Step 1.3.5: Connect Docker Events to WebSocket Broadcasting

Integrate Docker events with the WebSocket system:

```rust
impl DockerEventMonitor {
    // ... existing code ...

    pub async fn broadcast_docker_event(&self, event: DockerEvent) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(server) = self.websocket_server.read().await.as_ref() {
            if let Some(message) = self.process_event(event) {
                server.broadcast_message(message).await?;
            }
        }
        Ok(())
    }

    pub async fn start_event_streaming(&self) -> Result<(), Box<dyn std::error::Error>> {
        let docker = self.docker.clone();
        let websocket_server = self.websocket_server.clone();
        let event_filters = self.event_filters.clone();

        tokio::spawn(async move {
            let mut interval = interval(Duration::from_millis(100));

            loop {
                interval.tick().await;

                if let Err(e) = Self::stream_docker_events(&docker, &websocket_server, &event_filters).await {
                    eprintln!("Error streaming Docker events: {}", e);
                    tokio::time::sleep(Duration::from_secs(1)).await;
                }
            }
        });

        Ok(())
    }

    async fn stream_docker_events(
        docker: &Docker,
        websocket_server: &Arc<RwLock<Option<WebSocketServer>>>,
        event_filters: &[String],
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Implement real-time Docker event streaming
        // This would use Docker's event API for real-time updates

        Ok(())
    }
}
```

**Deliverables:**

- Docker events connected to WebSocket
- Event broadcasting working
- Real-time streaming implemented

### Step 1.3.6: Add Error Handling for Docker API Failures

Implement comprehensive error handling:

```rust
use std::time::Duration;

impl DockerEventMonitor {
    // ... existing code ...

    pub async fn handle_docker_api_error(&self, error: Box<dyn std::error::Error>) {
        eprintln!("Docker API error: {}", error);

        // Notify WebSocket clients about the error
        if let Some(server) = self.websocket_server.read().await.as_ref() {
            let error_message = WebSocketMessage {
                message_type: "docker_error".to_string(),
                payload: serde_json::json!({
                    "error": error.to_string(),
                    "timestamp": std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                }),
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs(),
            };

            if let Err(e) = server.broadcast_message(error_message).await {
                eprintln!("Failed to broadcast error message: {}", e);
            }
        }
    }

    pub async fn retry_connection(&self, max_retries: u32, delay: Duration) -> Result<(), Box<dyn std::error::Error>> {
        let mut retries = 0;

        while retries < max_retries {
            match self.docker.ping().await {
                Ok(_) => {
                    println!("Docker connection restored");
                    return Ok(());
                }
                Err(e) => {
                    eprintln!("Docker connection failed (attempt {}/{}): {}", retries + 1, max_retries, e);
                    retries += 1;

                    if retries < max_retries {
                        tokio::time::sleep(delay).await;
                    }
                }
            }
        }

        Err("Failed to restore Docker connection after maximum retries".into())
    }
}
```

**Deliverables:**

- Error handling system implemented
- Connection retry logic working
- Error notifications to WebSocket clients

## Technical Details

### Required Files Modified

- `Cargo.toml` - Add docker-rs dependency
- `src/services/docker_events.rs` - New Docker event monitoring service
- `src/services/websocket.rs` - Integration with WebSocket server
- Handler files - Add Docker event commands

### Architecture Considerations

- Event streaming vs polling
- Event filtering and processing
- Error handling and recovery
- Performance optimization
- Memory management

### Performance Considerations

- Event polling frequency
- Event queue management
- Memory usage for event storage
- Concurrent event processing

## Testing Checklist

- [ ] Dependencies resolve correctly
- [ ] Docker event monitoring service starts
- [ ] Events are captured and processed
- [ ] Filtering system works correctly
- [ ] Events are broadcast via WebSocket
- [ ] Error handling works as expected
- [ ] Connection retry logic functional
- [ ] Performance meets requirements

## Definition of Done

- [ ] All implementation steps completed
- [ ] Docker events are monitored successfully
- [ ] Event filtering and processing works
- [ ] Integration with WebSocket completed
- [ ] Error handling implemented
- [ ] Basic testing completed
- [ ] Performance requirements met

## Notes

- Consider using Docker's real-time event API for better performance
- Implement event batching to reduce WebSocket traffic
- Add metrics and monitoring for event processing
- Test with various Docker event types and volumes
- Ensure proper cleanup of event resources
