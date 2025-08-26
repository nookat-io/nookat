# ENGINE-008.3: Update Frontend to Use EngineState

## Overview

Update the frontend to use the single `EngineState` response instead of making separate API calls for each entity type. Store all data in a top-level context/provider for efficient rendering.

## Description

Replace the current polling-based approach with a single call to get the complete engine state. Store all data (containers, images, volumes, networks) in a centralized context that components can access without additional API calls.

## Current State

- ✅ EngineState struct implemented
- ✅ Engine state handler created
- ❌ Frontend still making separate requests every second
- ❌ Data scattered across multiple providers/contexts
- ❌ No centralized state management

## Implementation Tasks

### Task 1: Create Engine State Context

- [ ] **1.1** Create `src/lib/engine-state-provider.tsx`
- [ ] **1.2** Implement `EngineStateProvider` context
- [ ] **1.3** Store complete `EngineState` in context
- [ ] **1.4** Provide methods to update state
- [ ] **1.5** Add to main app provider hierarchy

### Task 2: Update Main App

- [ ] **2.1** Wrap app with `EngineStateProvider`
- [ ] **2.2** Call `get_engine_state()` on app initialization
- [ ] **2.3** Store response in context
- [ ] **2.4** Remove individual entity providers

### Task 3: Update Components

- [ ] **3.1** Update `ContainersPage` to use context data
- [ ] **3.2** Update `ImagesPage` to use context data
- [ ] **3.3** Update `VolumesPage` to use context data
- [ ] **3.4** Update `NetworksPage` to use context data
- [ ] **3.5** Remove individual API calls from components

### Task 4: State Management

- [ ] **4.1** Implement state update methods in context
- [ ] **4.2** Add loading states for initial data fetch
- [ ] **4.3** Handle error states gracefully
- [ ] **4.4** Implement basic state validation

## Technical Requirements

### Context Structure

```typescript
interface EngineStateContext {
  engineState: EngineState | null;
  isLoading: boolean;
  error: string | null;
  refreshState: () => Promise<void>;
  updateContainer: (id: string, container: Container) => void;
  // Similar methods for other entities
}
```

### Provider Implementation

- Single API call to `get_engine_state()`
- Store complete state in context
- Provide update methods for individual entities
- Handle loading and error states

## Dependencies

- ENGINE-008.1 (EngineState struct)
- ENGINE-008.2 (Engine state handler)
- Existing React components
- Tauri invoke for API calls

## Testing Requirements

- [ ] Context provides complete engine state
- [ ] Components render data from context
- [ ] No additional API calls made
- [ ] State updates work correctly
- [ ] Loading and error states handled

## Acceptance Criteria

- [ ] Frontend uses single `get_engine_state()` call
- [ ] All data stored in centralized context
- [ ] Components access data without API calls
- [ ] Initial loading state implemented
- [ ] Basic error handling in place

## Definition of Done

- [ ] EngineStateProvider implemented
- [ ] All components updated to use context
- [ ] No more individual API calls
- [ ] Centralized state management working
- [ ] Basic testing completed

## Estimated Effort

**2-3 days**

## Notes

- **Priority**: High - Core functionality change
- **Dependencies**: ENGINE-008.1, ENGINE-008.2
- **Risk**: Medium - Significant frontend changes
- **Testing**: Component integration testing required
- **Performance**: Should improve initial load time
