# Task 1.4: Frontend Plugin Integration

## Overview

Create a WebSocket connection manager hook and integrate the Tauri WebSocket plugin with the React frontend to establish and manage real-time connections.

## Dependencies

- Task 1.1 completed (Plugin Installation and Configuration)
- Task 1.2 completed (Backend WebSocket Server)
- Task 1.3 completed (Web Socket Setup)

## Acceptance Criteria

- [ ] WebSocket connection manager hook created (`src/hooks/use-websocket.ts`)
- [ ] Connection state management implemented (connected, disconnected, reconnecting)
- [ ] Connection lifecycle methods added (connect, disconnect, reconnect)
- [ ] WebSocket event listeners created
- [ ] Error handling and logging implemented
- [ ] Connection health monitoring added

## Implementation Steps

### Step 1.4.1: Create WebSocket Connection Manager Hook

Create `src/hooks/use-websocket.ts` with connection management:

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

export interface WebSocketMessage {
  message_type: string;
  payload: any;
  timestamp: number;
}

export interface WebSocketConnection {
  id: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
  url: string;
  lastMessage?: WebSocketMessage;
  error?: string;
}

export interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = 'ws://localhost:8080',
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [connection, setConnection] = useState<WebSocketConnection>({
    id: '',
    status: 'disconnected',
    url,
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  const connect = useCallback(async () => {
    if (isConnectingRef.current || connection.status === 'connected') {
      return;
    }

    isConnectingRef.current = true;
    setConnection(prev => ({
      ...prev,
      status: 'connecting',
      error: undefined,
    }));

    try {
      // Use Tauri command to establish WebSocket connection
      const result = await invoke('start_websocket_connection', { url });

      if (result) {
        setConnection(prev => ({
          ...prev,
          status: 'connected',
          id: result as string,
        }));
        onConnect?.();
        reconnectAttemptsRef.current = 0;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Connection failed';
      setConnection(prev => ({
        ...prev,
        status: 'disconnected',
        error: errorMessage,
      }));
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      isConnectingRef.current = false;
    }
  }, [url, connection.status, onConnect, onError]);

  const disconnect = useCallback(async () => {
    if (connection.status === 'disconnected') {
      return;
    }

    try {
      if (connection.id) {
        await invoke('close_websocket_connection', {
          connectionId: connection.id,
        });
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }

    setConnection(prev => ({ ...prev, status: 'disconnected', id: '' }));
    onDisconnect?.();

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, [connection.status, connection.id, onDisconnect]);

  const reconnect = useCallback(async () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setConnection(prev => ({
        ...prev,
        status: 'disconnected',
        error: 'Max reconnection attempts reached',
      }));
      return;
    }

    reconnectAttemptsRef.current++;
    setConnection(prev => ({ ...prev, status: 'reconnecting' }));

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, reconnectInterval);
  }, [connect, reconnectInterval, maxReconnectAttempts]);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    connection,
    connect,
    disconnect,
    reconnect,
    isConnected: connection.status === 'connected',
    isConnecting: connection.status === 'connecting',
    isReconnecting: connection.status === 'reconnecting',
    error: connection.error,
  };
}
```

**Deliverables:**

- WebSocket connection manager hook created
- Basic connection management implemented
- Tauri integration working

### Step 1.4.2: Implement Connection State Management

Add comprehensive state management for different connection states:

```typescript
// Extend the hook with additional state management
export function useWebSocket(options: UseWebSocketOptions = {}) {
  // ... existing code ...

  const [connectionStats, setConnectionStats] = useState({
    messagesReceived: 0,
    messagesSent: 0,
    lastActivity: Date.now(),
    uptime: 0,
  });

  const [connectionQuality, setConnectionQuality] = useState({
    latency: 0,
    packetLoss: 0,
    bandwidth: 0,
  });

  const updateConnectionStats = useCallback((type: 'received' | 'sent') => {
    setConnectionStats(prev => ({
      ...prev,
      [type === 'received' ? 'messagesReceived' : 'messagesSent']:
        prev[type === 'received' ? 'messagesReceived' : 'messagesSent'] + 1,
      lastActivity: Date.now(),
    }));
  }, []);

  const updateConnectionQuality = useCallback(
    (metrics: Partial<typeof connectionQuality>) => {
      setConnectionQuality(prev => ({ ...prev, ...metrics }));
    },
    []
  );

  // Add to the return object
  return {
    // ... existing returns ...
    connectionStats,
    connectionQuality,
    updateConnectionQuality,
  };
}
```

**Deliverables:**

- Connection state management working
- Statistics tracking implemented
- Quality metrics available

### Step 1.4.3: Add Connection Lifecycle Methods

Implement comprehensive lifecycle management:

```typescript
export function useWebSocket(options: UseWebSocketOptions = {}) {
  // ... existing code ...

  const sendMessage = useCallback(
    async (message: Omit<WebSocketMessage, 'timestamp'>) => {
      if (connection.status !== 'connected' || !connection.id) {
        throw new Error('WebSocket not connected');
      }

      try {
        const fullMessage: WebSocketMessage = {
          ...message,
          timestamp: Date.now(),
        };

        await invoke('send_websocket_message', {
          connectionId: connection.id,
          message: fullMessage,
        });

        updateConnectionStats('sent');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to send message';
        onError?.(new Error(errorMessage));
        throw error;
      }
    },
    [connection.status, connection.id, updateConnectionStats, onError]
  );

  const ping = useCallback(async (): Promise<number> => {
    if (connection.status !== 'connected' || !connection.id) {
      throw new Error('WebSocket not connected');
    }

    const startTime = Date.now();

    try {
      await invoke('ping_websocket_connection', {
        connectionId: connection.id,
      });
      const latency = Date.now() - startTime;
      updateConnectionQuality({ latency });
      return latency;
    } catch (error) {
      throw new Error('Ping failed');
    }
  }, [connection.status, connection.id, updateConnectionQuality]);

  // Add to return object
  return {
    // ... existing returns ...
    sendMessage,
    ping,
  };
}
```

**Deliverables:**

- Message sending functionality working
- Ping/pong implementation completed
- Lifecycle methods functional

### Step 1.4.4: Create WebSocket Event Listeners

Implement event listening and message handling:

```typescript
export function useWebSocket(options: UseWebSocketOptions = {}) {
  // ... existing code ...

  const [messageQueue, setMessageQueue] = useState<WebSocketMessage[]>([]);
  const messageListenerRef = useRef<(() => void) | null>(null);

  const setupMessageListener = useCallback(async () => {
    if (!connection.id || connection.status !== 'connected') {
      return;
    }

    try {
      // Set up message listener using Tauri event system
      const unlisten = await invoke('listen_websocket_messages', {
        connectionId: connection.id,
      });

      messageListenerRef.current = unlisten as () => void;

      // Listen for incoming messages
      window.__TAURI__.event.listen('websocket-message', event => {
        const message = event.payload as WebSocketMessage;

        setConnection(prev => ({
          ...prev,
          lastMessage: message,
        }));

        updateConnectionStats('received');
        onMessage?.(message);

        // Add to message queue for debugging
        setMessageQueue(prev => [...prev.slice(-99), message]); // Keep last 100 messages
      });
    } catch (error) {
      console.error('Failed to setup message listener:', error);
      onError?.(
        error instanceof Error
          ? error
          : new Error('Failed to setup message listener')
      );
    }
  }, [
    connection.id,
    connection.status,
    updateConnectionStats,
    onMessage,
    onError,
  ]);

  // Setup listener when connected
  useEffect(() => {
    if (connection.status === 'connected') {
      setupMessageListener();
    }

    return () => {
      if (messageListenerRef.current) {
        messageListenerRef.current();
        messageListenerRef.current = null;
      }
    };
  }, [connection.status, setupMessageListener]);

  // Add to return object
  return {
    // ... existing returns ...
    messageQueue,
    clearMessageQueue: () => setMessageQueue([]),
  };
}
```

**Deliverables:**

- Event listeners implemented
- Message handling working
- Message queue available

### Step 1.4.5: Implement Error Handling and Logging

Add comprehensive error handling and logging:

```typescript
export function useWebSocket(options: UseWebSocketOptions = {}) {
  // ... existing code ...

  const [errorLog, setErrorLog] = useState<
    Array<{
      timestamp: Date;
      error: string;
      context: string;
    }>
  >([]);

  const logError = useCallback((error: string, context: string) => {
    const errorEntry = {
      timestamp: new Date(),
      error,
      context,
    };

    setErrorLog(prev => [...prev.slice(-49), errorEntry]); // Keep last 50 errors
    console.error(`WebSocket Error [${context}]:`, error);
  }, []);

  const handleConnectionError = useCallback(
    (error: Error, context: string) => {
      logError(error.message, context);
      onError?.(error);

      // Auto-reconnect on certain errors
      if (context === 'connection_lost' && autoConnect) {
        reconnect();
      }
    },
    [logError, onError, autoConnect, reconnect]
  );

  const clearErrorLog = useCallback(() => {
    setErrorLog([]);
  }, []);

  // Add to return object
  return {
    // ... existing returns ...
    errorLog,
    clearErrorLog,
    logError,
  };
}
```

**Deliverables:**

- Error handling system implemented
- Error logging working
- Auto-reconnection on errors

### Step 1.4.6: Add Connection Health Monitoring

Implement health monitoring and diagnostics:

```typescript
export function useWebSocket(options: UseWebSocketOptions = {}) {
  // ... existing code ...

  const [healthStatus, setHealthStatus] = useState({
    isHealthy: true,
    lastHealthCheck: Date.now(),
    consecutiveFailures: 0,
    averageLatency: 0,
  });

  const healthCheck = useCallback(async () => {
    if (connection.status !== 'connected') {
      return;
    }

    try {
      const latency = await ping();
      const isHealthy = latency < 1000; // Consider healthy if latency < 1s

      setHealthStatus(prev => ({
        isHealthy,
        lastHealthCheck: Date.now(),
        consecutiveFailures: isHealthy ? 0 : prev.consecutiveFailures + 1,
        averageLatency: prev.averageLatency * 0.7 + latency * 0.3, // Exponential moving average
      }));

      if (!isHealthy && healthStatus.consecutiveFailures >= 3) {
        // Connection is unhealthy, attempt reconnection
        reconnect();
      }
    } catch (error) {
      setHealthStatus(prev => ({
        ...prev,
        isHealthy: false,
        consecutiveFailures: prev.consecutiveFailures + 1,
      }));
    }
  }, [connection.status, ping, healthStatus.consecutiveFailures, reconnect]);

  // Periodic health checks
  useEffect(() => {
    if (connection.status === 'connected') {
      const interval = setInterval(healthCheck, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [connection.status, healthCheck]);

  // Add to return object
  return {
    // ... existing returns ...
    healthStatus,
    healthCheck,
  };
}
```

**Deliverables:**

- Health monitoring implemented
- Automatic health checks working
- Health status available

## Technical Details

### Required Files Modified

- `src/hooks/use-websocket.ts` - New WebSocket hook
- `src/types/websocket.ts` - WebSocket type definitions
- Component files - Integration with WebSocket hook
- Tauri commands - WebSocket connection management

### Architecture Considerations

- React hooks pattern
- Tauri plugin integration
- State management
- Error handling
- Performance optimization

### Performance Considerations

- Memory usage for message queues
- Event listener cleanup
- Reconnection strategies
- Health check frequency

## Testing Checklist

- [ ] Hook initializes without errors
- [ ] Connection states transition correctly
- [ ] Message sending and receiving works
- [ ] Error handling functions properly
- [ ] Health monitoring works
- [ ] Auto-reconnection functions
- [ ] Memory usage is reasonable
- [ ] Performance meets requirements

## Definition of Done

- [ ] All implementation steps completed
- [ ] WebSocket hook works correctly
- [ ] Connection management functional
- [ ] Error handling implemented
- [ ] Health monitoring working
- [ ] Integration with Tauri completed
- [ ] Basic testing completed

## Notes

- Ensure proper cleanup of event listeners
- Test with various connection scenarios
- Monitor memory usage during development
- Implement proper error boundaries in React components
- Consider adding connection pooling for multiple connections
