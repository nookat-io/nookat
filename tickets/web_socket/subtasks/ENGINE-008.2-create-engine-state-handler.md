# ENGINE-008.2: Create Engine State Handler

## Overview

Create a simple handler that returns the current `EngineState` struct. This is a temporary placeholder that will later be replaced with WebSocket-based real-time updates.

## Description

Implement a basic handler that fetches the current Docker engine state and returns it as a single `EngineState` entity. This handler will serve as the foundation for transitioning from multiple individual API calls to a single comprehensive state response.

## Current State

- ✅ EngineState struct implemented
- ❌ No handler to return complete engine state
- ❌ Frontend still making separate requests for each entity type

## Implementation Tasks

### Task 1: Create Engine State Handler

- [ ] **1.1** Create `src-tauri/src/handlers/engine_state.rs`
- [ ] **1.2** Implement `get_engine_state()` handler function
- [ ] **1.3** Handler should return complete `EngineState` struct
- [ ] **1.4** Include all entities: containers, images, volumes, networks
- [ ] **1.5** Add handler to `src-tauri/src/handlers/mod.rs`

### Task 2: Handler Implementation

- [ ] **2.1** Fetch containers from Docker engine
- [ ] **2.2** Fetch images from Docker engine
- [ ] **2.3** Fetch volumes from Docker engine
- [ ] **2.4** Fetch networks from Docker engine
- [ ] **2.5** Fetch engine status and Docker info
- [ ] **2.6** Assemble into single `EngineState` struct
- [ ] **2.7** Return serialized response

## Technical Requirements

### Handler Function

```rust
#[tauri::command]
pub async fn get_engine_state() -> Result<EngineState, String> {
    // Fetch all Docker entities
    // Assemble into EngineState
    // Return complete state
}
```

### Response Structure

- Single `EngineState` entity containing all data
- All collections populated with current Docker state
- Engine status and system information included

## Dependencies

- `EngineState` struct from ENGINE-008.1
- Existing Docker service functions
- Tauri command framework

## Testing Requirements

- [ ] Handler returns complete engine state
- [ ] All entity collections are populated
- [ ] Response time is acceptable (< 2 seconds)
- [ ] Error handling works correctly

## Acceptance Criteria

- [ ] Handler successfully returns complete `EngineState`
- [ ] All Docker entities are included in response
- [ ] Handler is registered and accessible from frontend
- [ ] Basic error handling implemented

## Definition of Done

- [ ] Handler function implemented
- [ ] Handler registered in Tauri
- [ ] Returns complete engine state
- [ ] Basic testing completed

## Estimated Effort

**1-2 days**

## Notes

- **Priority**: High - Required for frontend integration
- **Dependencies**: ENGINE-008.1 (EngineState struct)
- **Risk**: Low - Simple handler implementation
- **Testing**: Basic functionality testing required
