# Task 1.2.5: Test WebSocket Setup

## Overview

Test the WebSocket setup by implementing a timestamp service that demonstrates real-time communication between the frontend and backend. The frontend will display the current timestamp received from the backend via WebSocket.

## Acceptance Criteria

- [ ] WebSocket server starts successfully on a specified port
- [ ] Frontend can connect to WebSocket server
- [ ] Backend sends current timestamp every second
- [ ] Frontend displays real-time timestamp updates
- [ ] Connection status is properly displayed
- [ ] Error handling works for connection failures
- [ ] WebSocket connection can be manually started/stopped

## Implementation Steps

### Step 1.2.5.1: Create WebSocket Test Service

Create a test service that sends timestamp updates:

```rust
// In src/services/websocket.rs
impl WebSocketServer {
    // ... existing code ...

    pub async fn start_timestamp_service(&self) -> Result<(), Box<dyn std::error::Error>> {
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
```

**Deliverables:**

- Timestamp service implemented
- Automatic timestamp broadcasting every second
- Error handling for failed sends

### Step 1.2.5.2: Add WebSocket Test Commands

Add Tauri commands for testing WebSocket functionality:

```rust
// In src/handlers/system/mod.rs
#[tauri::command]
#[instrument(skip_all, err)]
pub async fn start_websocket_timestamp_service(port: u16) -> Result<(), String> {
    let server = WebSocketServer::new(port);

    // Start the timestamp service
    server.start_timestamp_service().await.map_err(|e| e.to_string())?;

    // Start the server in a separate task
    tokio::spawn(async move {
        if let Err(e) = server.start().await {
            error!("WebSocket server error: {}", e);
        }
    });

    Ok(())
}

#[tauri::command]
#[instrument(skip_all, err)]
pub async fn get_websocket_status() -> Result<serde_json::Value, String> {
    // Return connection status and server info
    Ok(serde_json::json!({
        "status": "running",
        "connections": 0, // TODO: implement connection counting
        "uptime": chrono::Utc::now().timestamp()
    }))
}
```

**Deliverables:**

- WebSocket start command with timestamp service
- Status checking command
- Proper error handling

### Step 1.2.5.3: Create Frontend WebSocket Test Component

Create a React component to test WebSocket functionality:

```typescript
// In src/components/websocket/WebSocketTest.tsx
import React, { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

interface WebSocketMessage {
  message_type: string;
  payload: any;
  timestamp: number;
}

export const WebSocketTest: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [timestamp, setTimestamp] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [port, setPort] = useState(8080);
  const wsRef = useRef<WebSocket | null>(null);

  const startWebSocket = async () => {
    try {
      await invoke('start_websocket_timestamp_service', { port });
      setConnectionStatus('Starting server...');

      // Wait a moment for server to start
      setTimeout(() => {
        connectToWebSocket();
      }, 1000);
    } catch (error) {
      console.error('Failed to start WebSocket server:', error);
      setConnectionStatus('Failed to start server');
    }
  };

  const connectToWebSocket = () => {
    try {
      const ws = new WebSocket(`ws://localhost:${port}`);

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('Connected');
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.message_type === 'timestamp') {
            setTimestamp(message.payload.formatted);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        console.log('WebSocket disconnected');
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('Connection error');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('Failed to connect');
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('Disconnected');
  };

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">WebSocket Test</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Port:
        </label>
        <input
          type="number"
          value={port}
          onChange={(e) => setPort(parseInt(e.target.value) || 8080)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isConnected}
        />
      </div>

      <div className="mb-4">
        <button
          onClick={startWebSocket}
          disabled={isConnected}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Start WebSocket Server
        </button>
      </div>

      <div className="mb-4">
        <button
          onClick={connectToWebSocket}
          disabled={!isConnected || wsRef.current}
          className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Connect to WebSocket
        </button>
      </div>

      <div className="mb-4">
        <button
          onClick={disconnect}
          disabled={!isConnected}
          className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Disconnect
        </button>
      </div>

      <div className="mb-4 p-4 bg-gray-100 rounded-md">
        <div className="text-sm text-gray-600 mb-2">Connection Status:</div>
        <div className={`font-medium ${
          connectionStatus === 'Connected' ? 'text-green-600' :
          connectionStatus === 'Disconnected' ? 'text-gray-600' :
          'text-yellow-600'
        }`}>
          {connectionStatus}
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-md">
        <div className="text-sm text-gray-600 mb-2">Current Timestamp:</div>
        <div className="font-mono text-lg text-blue-800">
          {timestamp || 'Waiting for updates...'}
        </div>
      </div>
    </div>
  );
};
```

**Deliverables:**

- WebSocket test component created
- Connection management implemented
- Real-time timestamp display
- Connection status indicators

### Step 1.2.5.4: Add WebSocket Test to Settings Page

Integrate the WebSocket test component into the settings page:

```typescript
// In src/pages/SettingsPage.tsx
import { WebSocketTest } from '../components/websocket/WebSocketTest';

// Add to the settings page layout
<div className="space-y-6">
  {/* ... existing settings sections ... */}

  <div className="bg-white shadow rounded-lg">
    <div className="px-4 py-5 sm:p-6">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
        WebSocket Testing
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Test the WebSocket connection and real-time timestamp updates.
      </p>
      <WebSocketTest />
    </div>
  </div>
</div>
```

**Deliverables:**

- WebSocket test integrated into settings
- Accessible testing interface
- Consistent UI styling

### Step 1.2.5.5: Add WebSocket Test Route

Create a dedicated route for WebSocket testing:

```typescript
// In src/App.tsx or routing configuration
import { WebSocketTest } from './components/websocket/WebSocketTest';

// Add route for WebSocket testing
{
  path: '/websocket-test',
  element: <WebSocketTest />
}
```

**Deliverables:**

- Dedicated WebSocket test route
- Easy access for testing
- Isolated testing environment

## Testing Checklist

### Backend Testing

- [ ] WebSocket server starts without errors
- [ ] Timestamp service runs continuously
- [ ] Messages are properly serialized
- [ ] Error handling works for failed operations
- [ ] Server can handle multiple connections

### Frontend Testing

- [ ] Component renders correctly
- [ ] Connection buttons work properly
- [ ] Real-time timestamp updates display
- [ ] Connection status updates correctly
- [ ] Error states are handled gracefully

### Integration Testing

- [ ] Frontend can connect to backend WebSocket
- [ ] Timestamp messages are received correctly
- [ ] Connection lifecycle works end-to-end
- [ ] Server restart/reconnection works
- [ ] Multiple browser tabs can connect

## Technical Details

### Required Files Modified

- `src/services/websocket.rs` - Add timestamp service
- `src/handlers/system/mod.rs` - Add test commands
- `src/components/websocket/WebSocketTest.tsx` - New test component
- `src/pages/SettingsPage.tsx` - Integrate test component
- Routing configuration - Add test route

### Dependencies

- `chrono` - Already available for timestamp handling
- `tokio::time` - For interval-based broadcasting
- Frontend WebSocket API - Native browser support

### Architecture Considerations

- Timestamp service runs in background task
- WebSocket server handles multiple connections
- Frontend manages connection lifecycle
- Error handling at all levels

## Definition of Done

- [ ] All implementation steps completed
- [ ] WebSocket server starts successfully
- [ ] Frontend connects and receives timestamps
- [ ] Real-time updates work correctly
- [ ] Connection management functions properly
- [ ] Error handling works as expected
- [ ] Testing interface is user-friendly
- [ ] Integration with existing app completed

## Notes

- Use port 8080 as default for testing
- Implement proper cleanup on component unmount
- Consider adding connection metrics display
- Test with different network conditions
- Verify WebSocket works across different browsers
- Monitor memory usage during long-running tests
