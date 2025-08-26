import { useEffect, useState } from 'react';
import { useWebSocket } from '../../hooks/use-websocket';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';

export function WebSocketTimestamp() {
  const [currentTimestamp, setCurrentTimestamp] =
    useState<string>('Not connected');

  const {
    connect,
    disconnect,
    reconnect,
    isConnected,
    isConnecting,
    isReconnecting,
    error,
    connectionStats,
    healthStatus,
    lastMessage,
  } = useWebSocket({
    url: 'ws://localhost:8080',
    autoConnect: true,
    onConnect: () => {
      console.log('WebSocket connected');
    },
    onDisconnect: () => {
      setCurrentTimestamp('Disconnected');
    },
    onError: (error: Error) => {
      console.error('WebSocket error:', error);
    },
  });

  // Update timestamp display when connected
  useEffect(() => {
    if (isConnected) {
      const updateTimestamp = () => {
        const now = new Date();
        setCurrentTimestamp(now.toLocaleString());
      };

      updateTimestamp();
      const interval = setInterval(updateTimestamp, 1000);
      return () => clearInterval(interval);
    }
  }, [isConnected]);

  const getStatusColor = () => {
    if (isConnected) return 'bg-green-500';
    if (isConnecting) return 'bg-yellow-500';
    if (isReconnecting) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting';
    if (isReconnecting) return 'Reconnecting';
    return 'Disconnected';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            WebSocket Timestamp Service
            <Badge className={getStatusColor()}>{getStatusText()}</Badge>
          </CardTitle>
          <CardDescription>
            Real-time timestamp updates from WebSocket backend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Controls */}
          <div className="flex gap-2">
            <Button
              onClick={connect}
              disabled={isConnecting || isConnected}
              variant="outline"
            >
              Connect
            </Button>
            <Button
              onClick={disconnect}
              disabled={!isConnected}
              variant="outline"
            >
              Disconnect
            </Button>
            <Button
              onClick={reconnect}
              disabled={!isConnected}
              variant="outline"
            >
              Reconnect
            </Button>
          </div>

          {/* Current Timestamp Display */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">
              Current Timestamp
            </div>
            <div className="text-2xl font-mono font-bold text-primary">
              {currentTimestamp}
            </div>
          </div>

          {/* Connection Stats */}
          {isConnected && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Uptime</div>
                <div className="text-lg font-semibold">
                  {Math.floor(connectionStats.uptime / 60)}m{' '}
                  {connectionStats.uptime % 60}s
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">
                  Messages Received
                </div>
                <div className="text-lg font-semibold">
                  {connectionStats.messagesReceived}
                </div>
              </div>
            </div>
          )}

          {/* Health Status */}
          {isConnected && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">
                Connection Health
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${healthStatus.isHealthy ? 'bg-green-500' : 'bg-red-500'}`}
                  />
                  <span className="text-sm">
                    {healthStatus.isHealthy ? 'Healthy' : 'Unhealthy'}
                  </span>
                </div>
                <div className="text-sm">
                  Latency: {Math.round(healthStatus.averageLatency)}ms
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-800 font-medium">
                Connection Error
              </div>
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          {/* Last Message */}
          {lastMessage && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">
                Last Message
              </div>
              <div className="text-xs font-mono bg-background p-2 rounded border">
                <div>Type: {lastMessage.message_type}</div>
                <div>
                  Payload: {JSON.stringify(lastMessage.payload, null, 2)}
                </div>
                <div>
                  Timestamp:{' '}
                  {new Date(lastMessage.timestamp * 1000).toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
