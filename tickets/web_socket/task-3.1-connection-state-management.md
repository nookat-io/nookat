# Task 3.1: Connection State Management

## Overview

Implement comprehensive connection state management with visual indicators, automatic reconnection strategies, and user feedback for WebSocket connection issues.

## Dependencies

- Task 1.1 completed (Plugin Installation and Configuration)
- Task 1.2 completed (Backend WebSocket Server)
- Task 1.3 completed (Docker Event Monitoring)
- Task 1.4 completed (Frontend Plugin Integration)
- Task 2.1 completed (Container Status Updates)
- Task 2.2 completed (Resource Monitoring)
- Task 2.3 completed (System Event Broadcasting)

## Acceptance Criteria

- [ ] Connection status UI components designed and implemented
- [ ] Connection status indicators added to header/sidebar
- [ ] Connection quality monitoring implemented
- [ ] Automatic reconnection strategies created
- [ ] Connection health metrics implemented
- [ ] User feedback for connection issues added

## Implementation Steps

### Step 3.1.1: Design Connection Status UI Components

Create reusable connection status components:

```typescript
// src/components/ui/connection-status.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionStatus, ConnectionQuality } from '../../types/websocket';

interface ConnectionStatusProps {
  status: ConnectionStatus;
  quality?: ConnectionQuality;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConnectionStatusIndicator({
  status,
  quality,
  showDetails = false,
  size = 'md',
  className = '',
}: ConnectionStatusProps) {
  const getStatusConfig = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-300',
          icon: '●',
          label: 'Connected',
        };
      case 'connecting':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-300',
          icon: '⟳',
          label: 'Connecting',
        };
      case 'reconnecting':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-300',
          icon: '↻',
          label: 'Reconnecting',
        };
      case 'disconnected':
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-300',
          icon: '○',
          label: 'Disconnected',
        };
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          icon: '?',
          label: 'Unknown',
        };
    }
  };

  const getQualityIndicator = (quality?: ConnectionQuality) => {
    if (!quality) return null;

    const { latency, packetLoss } = quality;
    let qualityLevel: 'excellent' | 'good' | 'fair' | 'poor';
    let qualityColor: string;

    if (latency < 50 && packetLoss < 1) {
      qualityLevel = 'excellent';
      qualityColor = 'text-green-500';
    } else if (latency < 100 && packetLoss < 5) {
      qualityLevel = 'good';
      qualityColor = 'text-blue-500';
    } else if (latency < 200 && packetLoss < 10) {
      qualityLevel = 'fair';
      qualityColor = 'text-yellow-500';
    } else {
      qualityLevel = 'poor';
      qualityColor = 'text-red-500';
    }

    return (
      <div className={`text-xs ${qualityColor} flex items-center space-x-1`}>
        <span className="w-2 h-2 rounded-full bg-current"></span>
        <span>{qualityLevel}</span>
      </div>
    );
  };

  const config = getStatusConfig(status);
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <motion.div
        className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor} ${config.color}`}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <motion.span
          className="text-lg"
          animate={status === 'connecting' || status === 'reconnecting' ? { rotate: 360 } : {}}
          transition={{ duration: 1, repeat: status === 'connecting' || status === 'reconnecting' ? Infinity : 0 }}
        >
          {config.icon}
        </span>
        <span className={`font-medium ${sizeClasses[size]}`}>
          {config.label}
        </span>
      </motion.div>

      {showDetails && quality && (
        <div className="flex items-center space-x-3 text-xs text-gray-600">
          <span>Latency: {quality.latency}ms</span>
          <span>Loss: {quality.packetLoss}%</span>
          {getQualityIndicator(quality)}
        </div>
      )}
    </div>
  );
}

// Connection status with tooltip
export function ConnectionStatusWithTooltip({
  status,
  quality,
  children,
}: {
  status: ConnectionStatus;
  quality?: ConnectionQuality;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        <div className="flex flex-col space-y-1">
          <div className="font-medium">Connection Status</div>
          <div>Status: {status}</div>
          {quality && (
            <>
              <div>Latency: {quality.latency}ms</div>
              <div>Packet Loss: {quality.packetLoss}%</div>
            </>
          )}
        </div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}
```

**Deliverables:**

- Connection status UI components created
- Visual indicators implemented
- Tooltip functionality working

### Step 3.1.2: Implement Connection Status Indicators in Header/Sidebar

Add connection status to the main application layout:

```typescript
// src/components/layout/header.tsx
import React from 'react';
import { ConnectionStatusIndicator, ConnectionStatusWithTooltip } from '../ui/connection-status';
import { useWebSocket } from '../../hooks/use-websocket';

export function Header() {
  const { connection, connectionQuality, isConnected } = useWebSocket();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Nookat" className="h-8 w-8" />
            <h1 className="text-xl font-bold text-gray-900">Nookat</h1>
          </div>

          {/* Connection Status */}
          <ConnectionStatusWithTooltip
            status={connection.status}
            quality={connectionQuality}
          >
            <ConnectionStatusIndicator
              status={connection.status}
              quality={connectionQuality}
              size="sm"
              className="cursor-pointer"
            />
          </ConnectionStatusWithTooltip>
        </div>

        <div className="flex items-center space-x-4">
          {/* Connection Quality Bar */}
          {isConnected && connectionQuality && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">Connection Quality:</span>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((bar) => {
                  const quality = connectionQuality.latency < 50 ? 5 :
                                 connectionQuality.latency < 100 ? 4 :
                                 connectionQuality.latency < 200 ? 3 :
                                 connectionQuality.latency < 500 ? 2 : 1;

                  return (
                    <div
                      key={bar}
                      className={`w-2 h-4 rounded-sm ${
                        bar <= quality ? 'bg-green-400' : 'bg-gray-200'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* User Menu */}
          <div className="relative">
            {/* User menu implementation */}
          </div>
        </div>
      </div>
    </header>
  );
}

// Sidebar connection status
// src/components/layout/sidebar.tsx
import React from 'react';
import { ConnectionStatusIndicator } from '../ui/connection-status';
import { useWebSocket } from '../../hooks/use-websocket';

export function Sidebar() {
  const { connection, connectionQuality } = useWebSocket();

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 p-4">
      <div className="space-y-6">
        {/* Connection Status Section */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Connection Status</h3>

          <div className="space-y-3">
            <ConnectionStatusIndicator
              status={connection.status}
              quality={connectionQuality}
              size="sm"
            />

            {connectionQuality && (
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Latency:</span>
                  <span className={connectionQuality.latency < 100 ? 'text-green-600' : 'text-red-600'}>
                    {connectionQuality.latency}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Packet Loss:</span>
                  <span className={connectionQuality.packetLoss < 5 ? 'text-green-600' : 'text-red-600'}>
                    {connectionQuality.packetLoss}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-2">
          {/* Existing navigation items */}
        </nav>
      </div>
    </aside>
  );
}
```

**Deliverables:**

- Connection status added to header
- Connection status added to sidebar
- Quality indicators implemented

### Step 3.1.3: Add Connection Quality Monitoring

Implement comprehensive connection quality monitoring:

```typescript
// src/hooks/use-connection-quality.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './use-websocket';

export interface ConnectionQualityMetrics {
  latency: number;
  packetLoss: number;
  bandwidth: number;
  jitter: number;
  uptime: number;
  lastCheck: number;
}

export interface QualityThresholds {
  excellent: { latency: number; packetLoss: number };
  good: { latency: number; packetLoss: number };
  fair: { latency: number; packetLoss: number };
  poor: { latency: number; packetLoss: number };
}

const DEFAULT_THRESHOLDS: QualityThresholds = {
  excellent: { latency: 50, packetLoss: 1 },
  good: { latency: 100, packetLoss: 5 },
  fair: { latency: 200, packetLoss: 10 },
  poor: { latency: 500, packetLoss: 20 },
};

export function useConnectionQuality(
  thresholds: QualityThresholds = DEFAULT_THRESHOLDS
) {
  const { connection, isConnected, ping } = useWebSocket();
  const [metrics, setMetrics] = useState<ConnectionQualityMetrics>({
    latency: 0,
    packetLoss: 0,
    bandwidth: 0,
    jitter: 0,
    uptime: 0,
    lastCheck: 0,
  });

  const [qualityLevel, setQualityLevel] = useState<
    'excellent' | 'good' | 'fair' | 'poor'
  >('good');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const monitoringIntervalRef = useRef<NodeJS.Timeout>();
  const latencyHistoryRef = useRef<number[]>([]);
  const connectionStartTimeRef = useRef<number>(Date.now());

  const calculateQualityLevel = useCallback(
    (latency: number, packetLoss: number) => {
      if (
        latency <= thresholds.excellent.latency &&
        packetLoss <= thresholds.excellent.packetLoss
      ) {
        return 'excellent';
      } else if (
        latency <= thresholds.good.latency &&
        packetLoss <= thresholds.good.packetLoss
      ) {
        return 'good';
      } else if (
        latency <= thresholds.fair.latency &&
        packetLoss <= thresholds.fair.packetLoss
      ) {
        return 'fair';
      } else {
        return 'poor';
      }
    },
    [thresholds]
  );

  const measureLatency = useCallback(async (): Promise<number> => {
    if (!isConnected) return 0;

    try {
      const startTime = Date.now();
      const latency = await ping();
      const endTime = Date.now();

      // Calculate actual round-trip time
      const actualLatency = endTime - startTime;

      // Store in history for jitter calculation
      latencyHistoryRef.current.push(actualLatency);
      if (latencyHistoryRef.current.length > 10) {
        latencyHistoryRef.current.shift();
      }

      return actualLatency;
    } catch (error) {
      console.error('Failed to measure latency:', error);
      return 0;
    }
  }, [isConnected, ping]);

  const calculateJitter = useCallback(() => {
    const history = latencyHistoryRef.current;
    if (history.length < 2) return 0;

    let totalJitter = 0;
    for (let i = 1; i < history.length; i++) {
      totalJitter += Math.abs(history[i] - history[i - 1]);
    }

    return totalJitter / (history.length - 1);
  }, []);

  const estimatePacketLoss = useCallback((latency: number) => {
    // Simple packet loss estimation based on latency variance
    // In a real implementation, you'd track actual packet loss
    const baseLatency = 50; // Expected base latency
    const variance = Math.max(0, latency - baseLatency);

    if (variance < 10) return 0;
    if (variance < 50) return 2;
    if (variance < 100) return 5;
    if (variance < 200) return 10;
    return 20;
  }, []);

  const updateMetrics = useCallback(async () => {
    if (!isConnected) return;

    const latency = await measureLatency();
    const packetLoss = estimatePacketLoss(latency);
    const jitter = calculateJitter();
    const uptime = Date.now() - connectionStartTimeRef.current;
    const lastCheck = Date.now();

    const newMetrics: ConnectionQualityMetrics = {
      latency,
      packetLoss,
      bandwidth: 0, // Would need actual bandwidth measurement
      jitter,
      uptime,
      lastCheck,
    };

    setMetrics(newMetrics);

    const newQualityLevel = calculateQualityLevel(latency, packetLoss);
    setQualityLevel(newQualityLevel);

    // Emit quality change event if significant
    if (newQualityLevel !== qualityLevel) {
      window.dispatchEvent(
        new CustomEvent('connection-quality-change', {
          detail: {
            from: qualityLevel,
            to: newQualityLevel,
            metrics: newMetrics,
          },
        })
      );
    }
  }, [
    isConnected,
    measureLatency,
    estimatePacketLoss,
    calculateJitter,
    calculateQualityLevel,
    qualityLevel,
  ]);

  const startMonitoring = useCallback(() => {
    if (isMonitoring || !isConnected) return;

    setIsMonitoring(true);
    connectionStartTimeRef.current = Date.now();

    // Initial measurement
    updateMetrics();

    // Set up periodic monitoring
    monitoringIntervalRef.current = setInterval(updateMetrics, 30000); // Every 30 seconds
  }, [isMonitoring, isConnected, updateMetrics]);

  const stopMonitoring = useCallback(() => {
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = undefined;
    }
    setIsMonitoring(false);
  }, []);

  // Start monitoring when connected
  useEffect(() => {
    if (isConnected) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [isConnected, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    metrics,
    qualityLevel,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    updateMetrics,
    thresholds,
  };
}
```

**Deliverables:**

- Connection quality monitoring implemented
- Metrics calculation working
- Quality level assessment functional

### Step 3.1.4: Create Automatic Reconnection Strategies

Implement intelligent reconnection strategies:

```typescript
// src/services/reconnection-strategy.ts
export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  healthCheckInterval: number;
  unhealthyThreshold: number;
}

export class ReconnectionStrategy {
  private config: ReconnectionConfig;
  private attemptCount: number = 0;
  private currentDelay: number;
  private isReconnecting: boolean = false;
  private healthCheckTimer?: NodeJS.Timeout;
  private unhealthyCount: number = 0;

  constructor(config: Partial<ReconnectionConfig> = {}) {
    this.config = {
      maxAttempts: 10,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      healthCheckInterval: 5000,
      unhealthyThreshold: 3,
      ...config,
    };

    this.currentDelay = this.config.baseDelay;
  }

  shouldReconnect(): boolean {
    return this.attemptCount < this.config.maxAttempts && !this.isReconnecting;
  }

  getNextDelay(): number {
    if (this.attemptCount === 0) {
      return this.config.baseDelay;
    }

    // Exponential backoff with jitter
    let delay = Math.min(
      this.currentDelay * this.config.backoffMultiplier,
      this.config.maxDelay
    );

    if (this.config.jitter) {
      // Add ±25% jitter
      const jitter = delay * 0.25;
      delay += (Math.random() - 0.5) * jitter * 2;
    }

    this.currentDelay = delay;
    return Math.max(delay, 100); // Minimum 100ms delay
  }

  onReconnectionAttempt(): void {
    this.attemptCount++;
    this.isReconnecting = true;
  }

  onReconnectionSuccess(): void {
    this.attemptCount = 0;
    this.currentDelay = this.config.baseDelay;
    this.isReconnecting = false;
    this.unhealthyCount = 0;
    this.startHealthMonitoring();
  }

  onReconnectionFailure(): void {
    this.isReconnecting = false;
  }

  onHealthCheckFailed(): void {
    this.unhealthyCount++;

    if (this.unhealthyCount >= this.config.unhealthyThreshold) {
      this.triggerReconnection();
    }
  }

  onHealthCheckSuccess(): void {
    this.unhealthyCount = 0;
  }

  private triggerReconnection(): void {
    if (this.shouldReconnect()) {
      this.onReconnectionAttempt();
      // Emit reconnection event
      window.dispatchEvent(
        new CustomEvent('reconnection-triggered', {
          detail: { attempt: this.attemptCount, delay: this.getNextDelay() },
        })
      );
    }
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(() => {
      // Health check logic would be implemented here
      // For now, just a placeholder
    }, this.config.healthCheckInterval);
  }

  reset(): void {
    this.attemptCount = 0;
    this.currentDelay = this.config.baseDelay;
    this.isReconnecting = false;
    this.unhealthyCount = 0;

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  getStats() {
    return {
      attemptCount: this.attemptCount,
      maxAttempts: this.config.maxAttempts,
      currentDelay: this.currentDelay,
      isReconnecting: this.isReconnecting,
      unhealthyCount: this.unhealthyCount,
      unhealthyThreshold: this.config.unhealthyThreshold,
    };
  }
}

// Enhanced WebSocket hook with reconnection strategy
// src/hooks/use-websocket.ts (extend existing hook)
export function useWebSocket(options: UseWebSocketOptions = {}) {
  // ... existing code ...

  const reconnectionStrategy = useRef(
    new ReconnectionStrategy({
      maxAttempts: 15,
      baseDelay: 2000,
      maxDelay: 60000,
      backoffMultiplier: 1.5,
      jitter: true,
      healthCheckInterval: 10000,
      unhealthyThreshold: 2,
    })
  );

  const enhancedReconnect = useCallback(async () => {
    if (!reconnectionStrategy.current.shouldReconnect()) {
      setConnection(prev => ({
        ...prev,
        status: 'disconnected',
        error: 'Max reconnection attempts reached',
      }));
      return;
    }

    reconnectionStrategy.current.onReconnectionAttempt();
    setConnection(prev => ({ ...prev, status: 'reconnecting' }));

    const delay = reconnectionStrategy.current.getNextDelay();

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        await connect();
        reconnectionStrategy.current.onReconnectionSuccess();
      } catch (error) {
        reconnectionStrategy.current.onReconnectionFailure();
        // Continue with reconnection attempts
        enhancedReconnect();
      }
    }, delay);
  }, [connect]);

  // ... rest of existing code ...

  return {
    // ... existing returns ...
    reconnectionStats: reconnectionStrategy.current.getStats(),
    enhancedReconnect,
  };
}
```

**Deliverables:**

- Reconnection strategies implemented
- Exponential backoff working
- Health monitoring integration

### Step 3.1.5: Implement Connection Health Metrics

Add comprehensive health monitoring:

```typescript
// src/services/connection-health.ts
export interface HealthMetrics {
  uptime: number;
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  averageLatency: number;
  maxLatency: number;
  minLatency: number;
  connectionDrops: number;
  lastDropTime?: number;
  recoveryTime: number;
}

export class ConnectionHealthMonitor {
  private startTime: number = Date.now();
  private messageCounts = { total: 0, successful: 0, failed: 0 };
  private latencyHistory: number[] = [];
  private connectionDrops: number = 0;
  private lastDropTime?: number;
  private lastRecoveryTime?: number;

  onMessageSent(success: boolean): void {
    this.messageCounts.total++;
    if (success) {
      this.messageCounts.successful++;
    } else {
      this.messageCounts.failed++;
    }
  }

  onLatencyMeasured(latency: number): void {
    this.latencyHistory.push(latency);

    // Keep only last 100 measurements
    if (this.latencyHistory.length > 100) {
      this.latencyHistory.shift();
    }
  }

  onConnectionDrop(): void {
    this.connectionDrops++;
    this.lastDropTime = Date.now();
  }

  onConnectionRecovered(): void {
    this.lastRecoveryTime = Date.now();
  }

  getHealthMetrics(): HealthMetrics {
    const uptime = Date.now() - this.startTime;
    const avgLatency =
      this.latencyHistory.length > 0
        ? this.latencyHistory.reduce((a, b) => a + b, 0) /
          this.latencyHistory.length
        : 0;
    const maxLatency = Math.max(...this.latencyHistory, 0);
    const minLatency =
      this.latencyHistory.length > 0 ? Math.min(...this.latencyHistory) : 0;

    const recoveryTime =
      this.lastRecoveryTime && this.lastDropTime
        ? this.lastRecoveryTime - this.lastDropTime
        : 0;

    return {
      uptime,
      totalMessages: this.messageCounts.total,
      successfulMessages: this.messageCounts.successful,
      failedMessages: this.messageCounts.failed,
      averageLatency: avgLatency,
      maxLatency,
      minLatency,
      connectionDrops: this.connectionDrops,
      lastDropTime: this.lastDropTime,
      recoveryTime,
    };
  }

  getHealthScore(): number {
    const metrics = this.getHealthMetrics();

    if (metrics.totalMessages === 0) return 100;

    const successRate = metrics.successfulMessages / metrics.totalMessages;
    const latencyScore = Math.max(0, 100 - metrics.averageLatency / 10);
    const dropPenalty = metrics.connectionDrops * 10;

    return Math.max(
      0,
      Math.min(100, successRate * 40 + latencyScore * 40 + (20 - dropPenalty))
    );
  }

  reset(): void {
    this.startTime = Date.now();
    this.messageCounts = { total: 0, successful: 0, failed: 0 };
    this.latencyHistory = [];
    this.connectionDrops = 0;
    this.lastDropTime = undefined;
    this.lastRecoveryTime = undefined;
  }
}
```

**Deliverables:**

- Health metrics system implemented
- Health scoring working
- Performance tracking functional

### Step 3.1.6: Add User Feedback for Connection Issues

Implement user notifications and feedback:

```typescript
// src/components/ui/connection-notifications.tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConnectionStatus, ConnectionQuality } from '../../types/websocket';

interface ConnectionNotificationProps {
  status: ConnectionStatus;
  quality?: ConnectionQuality;
  error?: string;
  onDismiss?: () => void;
}

export function ConnectionNotification({
  status,
  quality,
  error,
  onDismiss,
}: ConnectionNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Auto-hide success notifications after 5 seconds
    if (status === 'connected' && !error) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [status, error, onDismiss]);

  const getNotificationConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: '✓',
          title: 'Connected',
          message: 'WebSocket connection established successfully',
          type: 'success',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800',
        };
      case 'connecting':
        return {
          icon: '⟳',
          title: 'Connecting',
          message: 'Establishing WebSocket connection...',
          type: 'info',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800',
        };
      case 'reconnecting':
        return {
          icon: '↻',
          title: 'Reconnecting',
          message: 'Attempting to reconnect...',
          type: 'warning',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800',
        };
      case 'disconnected':
        return {
          icon: '✗',
          title: 'Disconnected',
          message: error || 'WebSocket connection lost',
          type: 'error',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800',
        };
      default:
        return {
          icon: '?',
          title: 'Unknown',
          message: 'Connection status unknown',
          type: 'info',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          textColor: 'text-gray-800',
        };
    }
  };

  const config = getNotificationConfig();

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed top-4 right-4 max-w-sm w-full ${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg p-4 z-50`}
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-start space-x-3">
          <div className={`flex-shrink-0 text-xl ${config.textColor}`}>
            {config.icon}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-medium ${config.textColor}`}>
              {config.title}
            </h3>
            <p className={`text-sm ${config.textColor} mt-1`}>
              {config.message}
            </p>

            {/* Quality information */}
            {quality && status === 'connected' && (
              <div className="mt-2">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {showDetails ? 'Hide' : 'Show'} connection details
                </button>

                {showDetails && (
                  <motion.div
                    className="mt-2 p-2 bg-white rounded border text-xs"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="space-y-1">
                      <div>Latency: {quality.latency}ms</div>
                      <div>Packet Loss: {quality.packetLoss}%</div>
                      <div>Bandwidth: {quality.bandwidth} Mbps</div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss?.();
            }}
            className={`flex-shrink-0 ${config.textColor} hover:opacity-70`}
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Connection status bar component
export function ConnectionStatusBar() {
  const { connection, connectionQuality, error } = useWebSocket();
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    status: ConnectionStatus;
    quality?: ConnectionQuality;
    error?: string;
  }>>([]);

  // Add notification when status changes
  useEffect(() => {
    const newNotification = {
      id: Date.now().toString(),
      status: connection.status,
      quality: connectionQuality,
      error: error || connection.error,
    };

    setNotifications(prev => [...prev, newNotification]);
  }, [connection.status, connectionQuality, error, connection.error]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-0 right-0 z-50 space-y-2 p-4">
      {notifications.map(notification => (
        <ConnectionNotification
          key={notification.id}
          status={notification.status}
          quality={notification.quality}
          error={notification.error}
          onDismiss={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}
```

**Deliverables:**

- User notifications implemented
- Connection feedback system working
- Status bar component functional

## Technical Details

### Required Files Modified

- `src/components/ui/connection-status.tsx` - New connection status components
- `src/components/layout/header.tsx` - Added connection status
- `src/components/layout/sidebar.tsx` - Added connection status
- `src/hooks/use-connection-quality.ts` - New connection quality hook
- `src/services/reconnection-strategy.ts` - New reconnection service
- `src/services/connection-health.ts` - New health monitoring service
- `src/components/ui/connection-notifications.tsx` - New notification components

### Architecture Considerations

- Component composition
- State management
- Event handling
- Performance monitoring
- User experience

### Performance Considerations

- Notification rendering
- Health check frequency
- Memory usage for metrics
- Animation performance

## Testing Checklist

- [ ] Connection status components render correctly
- [ ] Status indicators update in real-time
- [ ] Quality monitoring functions properly
- [ ] Reconnection strategies work
- [ ] Health metrics are accurate
- [ ] User notifications display correctly
- [ ] Performance meets requirements

## Definition of Done

- [ ] All implementation steps completed
- [ ] Connection status management working
- [ ] Visual indicators functional
- [ ] Quality monitoring implemented
- [ ] Reconnection strategies working
- [ ] Health metrics accurate
- [ ] User feedback system functional

## Notes

- Ensure notifications don't overwhelm the user
- Test with various connection quality scenarios
- Monitor performance impact of health checks
- Consider user preferences for notification frequency
- Implement accessibility features for status indicators
