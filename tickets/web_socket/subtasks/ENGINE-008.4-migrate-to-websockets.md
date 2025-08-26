# ENGINE-008.4: Migrate to WebSocket Updates

## Overview

Replace the single API call approach with real-time WebSocket updates. When the engine state changes, send the complete updated `EngineState` struct to the frontend automatically.

## Description

Implement WebSocket-based real-time updates where the backend automatically sends the complete `EngineState` whenever Docker entities change. This eliminates the need for manual refresh calls and provides instant updates.

## Current State

- ✅ EngineState struct implemented
- ✅ Engine state handler created
- ✅ Frontend using centralized state management
- ❌ Still using manual API calls for updates
- ❌ No real-time updates
- ❌ WebSocket infrastructure not utilized

## Implementation Tasks

### Task 1: WebSocket State Broadcasting

- [ ] **1.1** Create WebSocket message for engine state updates
- [ ] **1.2** Implement state change detection in backend
- [ ] **1.3** Broadcast updated `EngineState` on changes
- [ ] **1.4** Handle WebSocket connection management

### Task 2: Frontend WebSocket Integration

- [ ] **2.1** Update `EngineStateProvider` to listen to WebSocket
- [ ] **2.2** Replace manual refresh with WebSocket updates
- [ ] **2.3** Handle WebSocket connection states
- [ ] **2.4** Implement automatic reconnection

### Task 3: State Change Detection

- [ ] **3.1** Monitor Docker events for changes
- [ ] **3.2** Detect container state changes
- [ ] **3.3** Detect image changes
- [ ] **3.4** Detect volume and network changes
- [ ] **3.5** Trigger WebSocket broadcasts on changes

### Task 4: Remove Manual Refresh

- [ ] **4.1** Remove `refreshState()` method from context
- [ ] **4.2** Remove manual refresh buttons from UI
- [ ] **4.3** Update components to rely on WebSocket updates
- [ ] **4.4** Clean up polling-related code

## Technical Requirements

### WebSocket Message Structure

```typescript
interface WebSocketMessage {
  type: 'engine_state_update';
  data: EngineState;
  timestamp: string;
}
```

### Backend Broadcasting

- Listen to Docker events
- Detect state changes
- Send complete updated state via WebSocket
- Handle multiple connected clients

### Frontend WebSocket Handling

- Listen for state update messages
- Update context automatically
- Handle connection issues gracefully
- Maintain real-time state synchronization

## Dependencies

- ENGINE-008.1 (EngineState struct)
- ENGINE-008.2 (Engine state handler)
- ENGINE-008.3 (Frontend context implementation)
- Existing WebSocket infrastructure
- Docker event monitoring

## Testing Requirements

- [ ] WebSocket broadcasts state changes
- [ ] Frontend receives and updates state automatically
- [ ] No manual refresh needed
- [ ] Connection handling works correctly
- [ ] State synchronization is accurate

## Acceptance Criteria

- [ ] WebSocket broadcasts engine state updates
- [ ] Frontend updates automatically on state changes
- [ ] No manual refresh functionality needed
- [ ] Real-time updates working correctly
- [ ] Connection handling robust

## Definition of Done

- [ ] WebSocket state broadcasting implemented
- [ ] Frontend listens to WebSocket updates
- [ ] Manual refresh removed
- [ ] Real-time updates working
- [ ] Connection handling tested

## Estimated Effort

**3-4 days**

## Notes

- **Priority**: High - Core real-time functionality
- **Dependencies**: ENGINE-008.1, ENGINE-008.2, ENGINE-008.3
- **Risk**: Medium - WebSocket integration complexity
- **Testing**: Real-time update testing required
- **Performance**: Should provide instant updates
