export interface WebSocketMessage {
  message_type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

// New engine state update message type
export interface EngineStateUpdateMessage {
  type: 'engine_state_update';
  data: Record<string, unknown>; // EngineState type - using Record for flexibility
  timestamp: string;
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

export interface WebSocketConnectionStats {
  messagesReceived: number;
  messagesSent: number;
  lastActivity: number;
  uptime: number;
}

export interface WebSocketHealthStatus {
  isHealthy: boolean;
  lastHealthCheck: number;
  consecutiveFailures: number;
  averageLatency: number;
}
