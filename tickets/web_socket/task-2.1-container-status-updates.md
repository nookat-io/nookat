# Task 2.1: Container Status Updates

## Overview

Implement real-time container status updates by subscribing to Docker container events and updating UI components without requiring manual refresh.

## Dependencies

- Task 1.1 completed (Plugin Installation and Configuration)
- Task 1.2 completed (Backend WebSocket Server)
- Task 1.3 completed (Docker Event Monitoring)
- Task 1.4 completed (Frontend Plugin Integration)

## Acceptance Criteria

- [ ] Container event subscription system created
- [ ] Real-time container status synchronization implemented
- [ ] Container table components updated for live updates
- [ ] Visual indicators for real-time status changes added
- [ ] Status change animations implemented
- [ ] Testing with multiple container state changes completed

## Implementation Steps

### Step 2.1.1: Create Container Event Subscription System

Create a container event subscription service that integrates with the WebSocket system:

```typescript
// src/services/container-events.ts
import { useWebSocket, WebSocketMessage } from '../hooks/use-websocket';

export interface ContainerEvent {
  id: string;
  type: 'container_event';
  action:
    | 'start'
    | 'stop'
    | 'restart'
    | 'pause'
    | 'resume'
    | 'create'
    | 'destroy'
    | 'die'
    | 'kill';
  container_id: string;
  container_name: string;
  timestamp: number;
  details?: Record<string, any>;
}

export interface ContainerStatus {
  id: string;
  name: string;
  status:
    | 'running'
    | 'stopped'
    | 'paused'
    | 'restarting'
    | 'removing'
    | 'created'
    | 'exited';
  state:
    | 'running'
    | 'stopped'
    | 'paused'
    | 'restarting'
    | 'removing'
    | 'created'
    | 'exited';
  health?: 'healthy' | 'unhealthy' | 'starting' | 'none';
  last_update: number;
}

export class ContainerEventService {
  private static instance: ContainerEventService;
  private eventHandlers: Map<string, (event: ContainerEvent) => void> =
    new Map();
  private containerStatuses: Map<string, ContainerStatus> = new Map();

  static getInstance(): ContainerEventService {
    if (!ContainerEventService.instance) {
      ContainerEventService.instance = new ContainerEventService();
    }
    return ContainerEventService.instance;
  }

  subscribe(
    containerId: string,
    handler: (event: ContainerEvent) => void
  ): () => void {
    this.eventHandlers.set(containerId, handler);

    return () => {
      this.eventHandlers.delete(containerId);
    };
  }

  subscribeToAll(handler: (event: ContainerEvent) => void): () => void {
    const id = `all_${Date.now()}`;
    this.eventHandlers.set(id, handler);

    return () => {
      this.eventHandlers.delete(id);
    };
  }

  processWebSocketMessage(message: WebSocketMessage): void {
    if (message.message_type === 'container_event') {
      const event = message.payload as ContainerEvent;
      this.handleContainerEvent(event);
    }
  }

  private handleContainerEvent(event: ContainerEvent): void {
    // Update container status
    this.updateContainerStatus(event);

    // Notify all handlers
    this.eventHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in container event handler:', error);
      }
    });
  }

  private updateContainerStatus(event: ContainerEvent): void {
    const currentStatus = this.containerStatuses.get(event.container_id);

    const newStatus: ContainerStatus = {
      id: event.container_id,
      name: event.container_name,
      status: this.mapActionToStatus(event.action),
      state: this.mapActionToStatus(event.action),
      last_update: event.timestamp,
      health: currentStatus?.health,
    };

    this.containerStatuses.set(event.container_id, newStatus);
  }

  private mapActionToStatus(action: string): ContainerStatus['status'] {
    switch (action) {
      case 'start':
        return 'running';
      case 'stop':
      case 'die':
      case 'kill':
        return 'stopped';
      case 'pause':
        return 'paused';
      case 'resume':
        return 'running';
      case 'restart':
        return 'restarting';
      case 'create':
        return 'created';
      case 'destroy':
        return 'removing';
      default:
        return 'exited';
    }
  }

  getContainerStatus(containerId: string): ContainerStatus | undefined {
    return this.containerStatuses.get(containerId);
  }

  getAllContainerStatuses(): ContainerStatus[] {
    return Array.from(this.containerStatuses.values());
  }
}
```

**Deliverables:**

- Container event subscription service created
- Event processing system implemented
- Status mapping logic working

### Step 2.1.2: Implement Real-time Container Status Synchronization

Create a hook for real-time container status synchronization:

```typescript
// src/hooks/use-container-status.ts
import { useState, useEffect, useCallback } from 'react';
import {
  ContainerEventService,
  ContainerEvent,
  ContainerStatus,
} from '../services/container-events';
import { useWebSocket } from './use-websocket';

export interface UseContainerStatusOptions {
  containerId?: string;
  autoSubscribe?: boolean;
  onStatusChange?: (status: ContainerStatus) => void;
  onEvent?: (event: ContainerEvent) => void;
}

export function useContainerStatus(options: UseContainerStatusOptions = {}) {
  const {
    containerId,
    autoSubscribe = true,
    onStatusChange,
    onEvent,
  } = options;

  const [containerStatus, setContainerStatus] =
    useState<ContainerStatus | null>(null);
  const [recentEvents, setRecentEvents] = useState<ContainerEvent[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const { connection, isConnected } = useWebSocket({
    onMessage: message => {
      if (message.message_type === 'container_event') {
        const event = message.payload as ContainerEvent;
        handleContainerEvent(event);
      }
    },
  });

  const handleContainerEvent = useCallback(
    (event: ContainerEvent) => {
      // Add to recent events
      setRecentEvents(prev => [event, ...prev.slice(0, 9)]); // Keep last 10 events

      // Update status if this is the container we're monitoring
      if (!containerId || event.container_id === containerId) {
        const service = ContainerEventService.getInstance();
        const newStatus = service.getContainerStatus(event.container_id);

        if (newStatus) {
          setContainerStatus(newStatus);
          onStatusChange?.(newStatus);
        }
      }

      // Notify event handler
      onEvent?.(event);
    },
    [containerId, onStatusChange, onEvent]
  );

  const subscribe = useCallback(() => {
    if (!isConnected) return;

    const service = ContainerEventService.getInstance();

    if (containerId) {
      // Subscribe to specific container
      const unsubscribe = service.subscribe(containerId, handleContainerEvent);
      setIsSubscribed(true);

      // Get initial status
      const initialStatus = service.getContainerStatus(containerId);
      if (initialStatus) {
        setContainerStatus(initialStatus);
      }

      return unsubscribe;
    } else {
      // Subscribe to all containers
      const unsubscribe = service.subscribeToAll(handleContainerEvent);
      setIsSubscribed(true);

      // Get all container statuses
      const allStatuses = service.getAllContainerStatuses();
      if (allStatuses.length > 0) {
        // For now, just set the first one as example
        setContainerStatus(allStatuses[0]);
      }

      return unsubscribe;
    }
  }, [containerId, isConnected, handleContainerEvent]);

  // Auto-subscribe when connected
  useEffect(() => {
    if (autoSubscribe && isConnected && !isSubscribed) {
      const unsubscribe = subscribe();
      return unsubscribe;
    }
  }, [autoSubscribe, isConnected, isSubscribed, subscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setIsSubscribed(false);
    };
  }, []);

  return {
    containerStatus,
    recentEvents,
    isSubscribed,
    isConnected,
    subscribe,
    clearEvents: () => setRecentEvents([]),
  };
}
```

**Deliverables:**

- Container status hook implemented
- Real-time synchronization working
- Event handling functional

### Step 2.1.3: Update Container Table Components for Live Updates

Modify existing container table components to use real-time updates:

```typescript
// src/components/containers/containers-table.tsx
import React, { useEffect, useState } from 'react';
import { useContainerStatus } from '../../hooks/use-container-status';
import { ContainerEventService } from '../../services/container-events';
import { ContainerRow } from './container-row';
import { ContainerStatusBadge } from './container-status-badge';

export function ContainersTable() {
  const [containers, setContainers] = useState<Container[]>([]);
  const { isConnected, subscribe } = useContainerStatus({
    autoSubscribe: false, // We'll handle subscription manually
  });

  // Subscribe to all container events
  useEffect(() => {
    if (isConnected) {
      const unsubscribe = subscribe();
      return unsubscribe;
    }
  }, [isConnected, subscribe]);

  // Listen for container events and update the table
  useEffect(() => {
    const service = ContainerEventService.getInstance();

    const unsubscribe = service.subscribeToAll((event) => {
      // Update containers list based on event
      setContainers(prev => {
        const newContainers = [...prev];
        const existingIndex = newContainers.findIndex(c => c.id === event.container_id);

        if (existingIndex >= 0) {
          // Update existing container
          const updatedContainer = {
            ...newContainers[existingIndex],
            status: event.action,
            lastUpdated: event.timestamp,
          };
          newContainers[existingIndex] = updatedContainer;
        } else if (event.action === 'create') {
          // Add new container
          const newContainer: Container = {
            id: event.container_id,
            name: event.container_name,
            status: 'created',
            image: event.details?.image || 'unknown',
            created: event.timestamp,
            lastUpdated: event.timestamp,
          };
          newContainers.push(newContainer);
        } else if (event.action === 'destroy') {
          // Remove destroyed container
          return newContainers.filter(c => c.id !== event.container_id);
        }

        return newContainers;
      });
    });

    return unsubscribe;
  }, []);

  return (
    <div className="containers-table">
      <div className="table-header">
        <div className="connection-status">
          {isConnected ? (
            <span className="status-connected">● Live Updates</span>
          ) : (
            <span className="status-disconnected">○ Polling Mode</span>
          )}
        </div>
      </div>

      <div className="table-body">
        {containers.map(container => (
          <ContainerRow
            key={container.id}
            container={container}
            isLiveUpdate={isConnected}
          />
        ))}
      </div>
    </div>
  );
}
```

**Deliverables:**

- Container table updated for live updates
- Real-time status changes working
- Connection status indicator added

### Step 2.1.4: Add Visual Indicators for Real-time Status Changes

Implement visual feedback for status changes:

```typescript
// src/components/containers/container-status-badge.tsx
import React, { useEffect, useState } from 'react';
import { ContainerStatus } from '../../types/container';

interface ContainerStatusBadgeProps {
  status: string;
  isLiveUpdate?: boolean;
  lastUpdate?: number;
}

export function ContainerStatusBadge({ status, isLiveUpdate, lastUpdate }: ContainerStatusBadgeProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);

  // Show update animation when status changes
  useEffect(() => {
    if (lastUpdate) {
      setIsUpdating(true);
      setUpdateCount(prev => prev + 1);

      const timer = setTimeout(() => {
        setIsUpdating(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [lastUpdate]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-red-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'restarting':
        return 'bg-blue-500';
      case 'removing':
        return 'bg-gray-500';
      case 'created':
        return 'bg-purple-500';
      case 'exited':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`relative`}>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(status)}`}>
          {status}
        </span>

        {/* Live update indicator */}
        {isLiveUpdate && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        )}

        {/* Update animation */}
        {isUpdating && (
          <div className="absolute inset-0 bg-white bg-opacity-50 rounded-full animate-ping" />
        )}
      </div>

      {/* Update counter for debugging */}
      {isLiveUpdate && updateCount > 0 && (
        <span className="text-xs text-gray-500">
          {updateCount} updates
        </span>
      )}
    </div>
  );
}
```

**Deliverables:**

- Visual indicators implemented
- Status change animations working
- Live update indicators added

### Step 2.1.5: Implement Status Change Animations

Add smooth animations for status transitions:

```typescript
// src/components/containers/container-row.tsx
import React, { useState, useEffect } from 'react';
import { Container } from '../../types/container';
import { ContainerStatusBadge } from './container-status-badge';
import { motion, AnimatePresence } from 'framer-motion';

interface ContainerRowProps {
  container: Container;
  isLiveUpdate?: boolean;
}

export function ContainerRow({ container, isLiveUpdate }: ContainerRowProps) {
  const [previousStatus, setPreviousStatus] = useState(container.status);
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  // Detect status changes and trigger animations
  useEffect(() => {
    if (previousStatus !== container.status) {
      setIsStatusChanging(true);
      setPreviousStatus(container.status);

      const timer = setTimeout(() => {
        setIsStatusChanging(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [container.status, previousStatus]);

  const getStatusTransitionColor = (fromStatus: string, toStatus: string) => {
    // Define transition colors for different status changes
    const transitions: Record<string, Record<string, string>> = {
      'stopped': {
        'running': 'bg-green-100 border-green-300',
        'restarting': 'bg-blue-100 border-blue-300',
      },
      'running': {
        'stopped': 'bg-red-100 border-red-300',
        'paused': 'bg-yellow-100 border-yellow-300',
      },
      'paused': {
        'running': 'bg-green-100 border-green-300',
        'stopped': 'bg-red-100 border-red-300',
      },
    };

    return transitions[fromStatus]?.[toStatus] || 'bg-white border-gray-200';
  };

  return (
    <motion.div
      className={`container-row border rounded-lg p-4 mb-2 transition-all duration-300 ${
        isStatusChanging
          ? getStatusTransitionColor(previousStatus, container.status)
          : 'bg-white border-gray-200'
      }`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <h3 className="text-lg font-medium text-gray-900">
              {container.name}
            </h3>
            <p className="text-sm text-gray-500">ID: {container.id}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ContainerStatusBadge
            status={container.status}
            isLiveUpdate={isLiveUpdate}
            lastUpdate={container.lastUpdated}
          />

          {/* Status change indicator */}
          <AnimatePresence>
            {isStatusChanging && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="w-3 h-3 bg-blue-500 rounded-full"
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Additional container details */}
      <div className="mt-2 text-sm text-gray-600">
        <span>Image: {container.image}</span>
        <span className="mx-2">•</span>
        <span>Created: {new Date(container.created).toLocaleString()}</span>
        {container.lastUpdated && (
          <>
            <span className="mx-2">•</span>
            <span>Updated: {new Date(container.lastUpdated).toLocaleString()}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
```

**Deliverables:**

- Status change animations implemented
- Smooth transitions working
- Visual feedback for changes

### Step 2.1.6: Test with Multiple Container State Changes

Create comprehensive testing for the container status update system:

```typescript
// src/tests/container-status-updates.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ContainerEventService } from '../services/container-events';
import { ContainersTable } from '../components/containers/containers-table';

describe('Container Status Updates', () => {
  beforeEach(() => {
    // Reset the singleton instance
    vi.resetModules();
  });

  it('should update container status in real-time', async () => {
    const service = ContainerEventService.getInstance();

    // Simulate container start event
    const startEvent = {
      id: 'test-1',
      type: 'container_event',
      action: 'start',
      container_id: 'container-123',
      container_name: 'test-container',
      timestamp: Date.now(),
    };

    // Trigger the event
    service.processWebSocketMessage({
      message_type: 'container_event',
      payload: startEvent,
      timestamp: Date.now(),
    });

    // Verify status was updated
    const status = service.getContainerStatus('container-123');
    expect(status?.status).toBe('running');
  });

  it('should handle multiple rapid status changes', async () => {
    const service = ContainerEventService.getInstance();

    const events = [
      { action: 'start', expectedStatus: 'running' },
      { action: 'pause', expectedStatus: 'paused' },
      { action: 'resume', expectedStatus: 'running' },
      { action: 'stop', expectedStatus: 'stopped' },
    ];

    for (const event of events) {
      const containerEvent = {
        id: `test-${Date.now()}`,
        type: 'container_event',
        action: event.action,
        container_id: 'container-123',
        container_name: 'test-container',
        timestamp: Date.now(),
      };

      service.processWebSocketMessage({
        message_type: 'container_event',
        payload: containerEvent,
        timestamp: Date.now(),
      });

      const status = service.getContainerStatus('container-123');
      expect(status?.status).toBe(event.expectedStatus);
    }
  });

  it('should notify all subscribers of status changes', async () => {
    const service = ContainerEventService.getInstance();
    const mockHandler = vi.fn();

    // Subscribe to all container events
    const unsubscribe = service.subscribeToAll(mockHandler);

    // Trigger an event
    const event = {
      id: 'test-1',
      type: 'container_event',
      action: 'start',
      container_id: 'container-123',
      container_name: 'test-container',
      timestamp: Date.now(),
    };

    service.processWebSocketMessage({
      message_type: 'container_event',
      payload: event,
      timestamp: Date.now(),
    });

    // Verify handler was called
    expect(mockHandler).toHaveBeenCalledWith(event);

    unsubscribe();
  });
});
```

**Deliverables:**

- Comprehensive testing implemented
- Multiple state change scenarios tested
- Event subscription testing completed

## Technical Details

### Required Files Modified

- `src/services/container-events.ts` - New container event service
- `src/hooks/use-container-status.ts` - New container status hook
- `src/components/containers/containers-table.tsx` - Updated for live updates
- `src/components/containers/container-status-badge.tsx` - Enhanced with live indicators
- `src/components/containers/container-row.tsx` - Added animations
- Test files for verification

### Architecture Considerations

- Event-driven architecture
- Real-time synchronization
- Component state management
- Performance optimization
- Error handling

### Performance Considerations

- Event batching
- Component re-rendering optimization
- Memory usage for event storage
- Animation performance

## Testing Checklist

- [ ] Container event service works correctly
- [ ] Real-time status synchronization functional
- [ ] UI components update without refresh
- [ ] Visual indicators display correctly
- [ ] Animations work smoothly
- [ ] Multiple state changes handled properly
- [ ] Event subscription system works
- [ ] Performance meets requirements

## Definition of Done

- [ ] All implementation steps completed
- [ ] Container status updates work in real-time
- [ ] UI components update automatically
- [ ] Visual feedback implemented
- [ ] Animations working smoothly
- [ ] Testing completed successfully
- [ ] Performance requirements met

## Notes

- Consider implementing event batching for high-frequency updates
- Monitor memory usage during rapid status changes
- Test with various container states and transitions
- Ensure animations don't impact performance
- Add error boundaries for event handling failures
