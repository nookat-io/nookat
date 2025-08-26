import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  WebSocketMessage,
  WebSocketConnection,
  UseWebSocketOptions,
  WebSocketConnectionStats,
  WebSocketHealthStatus,
} from '../types/websocket';

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = 'ws://localhost:8080',
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [connection, setConnection] = useState<WebSocketConnection>({
    id: '',
    status: 'disconnected',
    url,
  });

  const [connectionStats, setConnectionStats] =
    useState<WebSocketConnectionStats>({
      messagesReceived: 0,
      messagesSent: 0,
      lastActivity: Date.now(),
      uptime: 0,
    });

  const [healthStatus, setHealthStatus] = useState<WebSocketHealthStatus>({
    isHealthy: true,
    lastHealthCheck: Date.now(),
    consecutiveFailures: 0,
    averageLatency: 0,
  });

  const [lastMessage] = useState<WebSocketMessage | null>(null);

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const uptimeIntervalRef = useRef<NodeJS.Timeout>();
  const connectRef = useRef<() => Promise<void>>();
  const reconnectRef = useRef<() => Promise<void>>();

  const logError = useCallback((error: string, context: string) => {
    console.error(`WebSocket Error [${context}]:`, error);
  }, []);

  const handleConnectionError = useCallback(
    (error: Error, context: string) => {
      logError(error.message, context);
      onError?.(error);

      if (context === 'connection_lost' && autoConnect) {
        reconnectRef.current?.();
      }
    },
    [logError, onError, autoConnect]
  );

  const connect = useCallback(async () => {
    if (
      isConnectingRef.current ||
      connection.status === 'connected' ||
      connection.status === 'connecting'
    ) {
      return;
    }

    isConnectingRef.current = true;
    setConnection(prev => ({
      ...prev,
      status: 'connecting',
      error: undefined,
    }));

    try {
      await invoke('start_websocket_timestamp_service', { port: 8080 });

      const connectionId = `conn_${Date.now()}`;

      setConnection(prev => ({
        ...prev,
        status: 'connected',
        id: connectionId,
      }));

      uptimeIntervalRef.current = setInterval(() => {
        setConnectionStats(prev => ({
          ...prev,
          uptime: prev.uptime + 1,
        }));
      }, 1000);

      onConnect?.();
      reconnectAttemptsRef.current = 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Connection failed';
      setConnection(prev => ({
        ...prev,
        status: 'disconnected',
        error: errorMessage,
      }));
      handleConnectionError(
        error instanceof Error ? error : new Error(errorMessage),
        'connection_failed'
      );
    } finally {
      isConnectingRef.current = false;
    }
  }, [connection.status, onConnect, handleConnectionError]);

  // Store connect function in ref to avoid circular dependency
  connectRef.current = connect;

  const disconnect = useCallback(async () => {
    if (connection.status === 'disconnected') {
      return;
    }

    try {
      if (connection.id) {
        console.log('Disconnecting WebSocket connection:', connection.id);
      }
    } catch (_error) {
      console.error('Error disconnecting:', _error);
    }

    setConnection(prev => ({ ...prev, status: 'disconnected', id: '' }));
    onDisconnect?.();

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (uptimeIntervalRef.current) {
      clearInterval(uptimeIntervalRef.current);
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
      connectRef.current?.();
    }, reconnectInterval);
  }, [reconnectInterval, maxReconnectAttempts]);

  // Store reconnect function in ref to avoid circular dependency
  reconnectRef.current = reconnect;

  const healthCheck = useCallback(async () => {
    if (connection.status !== 'connected') {
      return;
    }

    try {
      // Simple health check - consider healthy if uptime > 0
      const isHealthy = connectionStats.uptime > 0;

      setHealthStatus(prev => ({
        isHealthy,
        lastHealthCheck: Date.now(),
        consecutiveFailures: isHealthy ? 0 : prev.consecutiveFailures + 1,
        averageLatency: 50, // Simulated latency
      }));

      if (!isHealthy && healthStatus.consecutiveFailures >= 3) {
        reconnectRef.current?.();
      }
    } catch {
      setHealthStatus(prev => ({
        ...prev,
        isHealthy: false,
        consecutiveFailures: prev.consecutiveFailures + 1,
      }));
    }
  }, [
    connection.status,
    connectionStats.uptime,
    healthStatus.consecutiveFailures,
  ]);

  // Auto-connect effect
  useEffect(() => {
    if (autoConnect) {
      connectRef.current?.();
    }

    return () => {
      // We need to handle disconnect differently since it's not in a ref
      // For now, we'll just clear the connection state
      setConnection(prev => ({ ...prev, status: 'disconnected', id: '' }));
    };
  }, [autoConnect]);

  // Periodic health checks
  useEffect(() => {
    if (connection.status === 'connected') {
      const interval = setInterval(healthCheck, 30000);
      return () => clearInterval(interval);
    }
  }, [connection.status, healthCheck]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (uptimeIntervalRef.current) {
        clearInterval(uptimeIntervalRef.current);
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
    connectionStats,
    healthStatus,
    lastMessage,
  };
}
