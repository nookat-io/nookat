# ENGINE-008: WebSocket Real-time Updates Implementation

## Overview

Implement WebSocket-based real-time updates to replace the current polling-based approach. This will provide instant updates when Docker engine state changes, eliminating the need for manual refresh and improving user experience.

## Description

Currently, the application relies on periodic polling to update container status and system information. We will implement a simple WebSocket-based system that automatically sends the complete `EngineState` whenever changes occur, providing real-time updates without manual intervention.

## Current State

- ✅ Basic WebSocket infrastructure exists
- ❌ No centralized state management
- ❌ Data scattered across multiple providers
- ❌ Frontend making separate requests every second

## Simplified Implementation Plan

### Phase 1: Core Engine State Structure ✅ COMPLETED

- **ENGINE-008.1**: Create EngineState struct in backend
- **Status**: ✅ Implemented

### Phase 2: Engine State Handler

- **ENGINE-008.2**: Create handler that returns current EngineState
- **Status**: 🔄 In Progress
- **Effort**: 1-2 days

### Phase 3: Frontend Integration

- **ENGINE-008.3**: Update frontend to use EngineState instead of separate requests
- **Status**: ⏳ Pending
- **Effort**: 2-3 days

### Phase 4: WebSocket Migration

- **ENGINE-008.4**: Migrate from pull-based to WebSocket-based updates
- **Status**: ⏳ Pending
- **Effort**: 3-4 days

## Technical Approach

### Simple WebSocket Message Structure

```typescript
interface WebSocketMessage {
  type: 'engine_state_update';
  data: EngineState;
  timestamp: string;
}
```

### Implementation Strategy

1. **Backend**: Send complete `EngineState` on any Docker change
2. **Frontend**: Listen to WebSocket and update context automatically
3. **No Complex Event Filtering**: Send full state for simplicity
4. **Automatic Updates**: No manual refresh needed

## Dependencies

- `EngineState` struct (ENGINE-008.1) ✅
- Tauri WebSocket plugin
- Existing WebSocket infrastructure
- Docker event monitoring

## Acceptance Criteria

- [ ] WebSocket broadcasts complete engine state on changes
- [ ] Frontend updates automatically without manual refresh
- [ ] All Docker entities (containers, images, volumes, networks) update in real-time
- [ ] Connection handling is robust with automatic reconnection
- [ ] Performance is acceptable (< 100ms update latency)

## Definition of Done

- [ ] All 4 phases completed successfully
- [ ] Real-time updates working for all entity types
- [ ] No manual refresh functionality needed
- [ ] WebSocket connection handling robust
- [ ] Basic testing completed

## Estimated Total Effort

**6-9 days** (much simpler than original 12-16 week plan)

## Notes

- **Priority**: High - Core functionality improvement
- **Approach**: Simple and focused, no complex features
- **Risk**: Low - Incremental implementation
- **Testing**: Basic functionality testing required
- **Performance**: Should provide instant updates with minimal overhead
