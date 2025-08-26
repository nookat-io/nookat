# ENGINE-008: EngineState Architecture and WebSocket-Based Real-Time Updates

## Overview

Implement a comprehensive `EngineState` struct that centralizes all Docker engine information (containers, images, volumes, networks) and transitions the application from polling-based data fetching to real-time WebSocket updates. This initiative represents a major architectural improvement that will eliminate the need for periodic API calls and provide instant updates for all Docker operations.

## Description

Currently, the application uses a polling-based approach where the frontend periodically calls backend commands (`list_containers`, `list_images`, etc.) to refresh data. This approach is inefficient, creates unnecessary load on the Docker API, and doesn't provide real-time feedback to users.

We need to implement a centralized `EngineState` struct that maintains the complete state of the Docker engine and broadcasts all changes via WebSockets. This will enable:

- Real-time updates for all Docker operations
- Reduced API calls and improved performance
- Better user experience with instant feedback
- Centralized state management
- Event-driven architecture

## Current State Analysis

### Existing Infrastructure

- ✅ Tauri WebSocket plugin already integrated
- ✅ Basic WebSocket connection management implemented
- ✅ Frontend WebSocket hooks available
- ✅ Docker event monitoring structure in place

### Current Limitations

- ❌ Data fetching relies on periodic polling (1-second intervals)
- ❌ No centralized state management
- ❌ Inefficient resource usage
- ❌ Delayed user feedback
- ❌ Multiple separate data providers

## Technical Requirements

### Core Architecture Changes

1. **EngineState Struct Implementation**
   - Centralized state container for all Docker entities
   - Atomic updates and change tracking
   - Event broadcasting system
   - State synchronization between backend and frontend

2. **WebSocket Event System**
   - Real-time event broadcasting for all Docker operations
   - Event filtering and subscription management
   - Efficient event serialization and transmission
   - Connection state management and recovery

3. **State Synchronization**
   - Initial state synchronization on connection
   - Incremental updates for changes
   - Conflict resolution and consistency
   - Offline state management

### Data Flow Architecture

```
Docker Engine → Docker Events → EngineState → WebSocket → Frontend State
     ↓              ↓            ↓           ↓           ↓
  Container    Event Stream   State      Broadcast   UI Update
  Changes     Processing     Update     to Clients   Rendering
```

## Implementation Plan

### Phase 1: EngineState Backend Implementation

#### Task 1.1: Core EngineState Structure

- [ ] **1.1.1** Create `EngineState` struct in `src-tauri/src/entities/engine_state.rs`
- [ ] **1.1.2** Implement container state management with `HashMap<String, Container>`
- [ ] **1.1.3** Implement image state management with `HashMap<String, Image>`
- [ ] **1.1.4** Implement volume state management with `HashMap<String, Volume>`
- [ ] **1.1.5** Implement network state management with `HashMap<String, Network>`
- [ ] **1.1.6** Add system information and engine status fields

#### Task 1.2: State Management Operations

- [ ] **1.2.1** Implement atomic state update methods
- [ ] **1.2.2** Add change tracking and diff generation
- [ ] **1.2.3** Create state validation and consistency checks
- [ ] **1.2.4** Implement state serialization for WebSocket transmission
- [ ] **1.2.5** Add state versioning and conflict resolution

#### Task 1.3: Event Broadcasting System

- [ ] **1.3.1** Create event types for all Docker operations
- [ ] **1.3.2** Implement event queue and broadcasting mechanism
- [ ] **1.3.3** Add event filtering and subscription management
- [ ] **1.3.4** Create event serialization and compression
- [ ] **1.3.5** Implement event acknowledgment and delivery guarantees

### Phase 2: Docker Event Integration

#### Task 2.1: Docker Event Monitoring

- [ ] **2.1.1** Enhance existing Docker event monitoring service
- [ ] **2.1.2** Implement event filtering for relevant operations
- [ ] **2.1.3** Add event deduplication and batching
- [ ] **2.1.4** Create event priority system
- [ ] **2.1.5** Implement event persistence for offline scenarios

#### Task 2.2: Event Processing Pipeline

- [ ] **2.2.1** Create event processing worker threads
- [ ] **2.2.2** Implement event validation and sanitization
- [ ] **2.2.3** Add event transformation and enrichment
- [ ] **2.2.4** Create event routing to appropriate handlers
- [ ] **2.2.5** Implement event error handling and recovery

#### Task 2.3: State Update Integration

- [ ] **2.3.1** Connect Docker events to EngineState updates
- [ ] **2.3.2** Implement atomic state modifications
- [ ] **2.3.3** Add state change notifications
- [ ] **2.3.4** Create state rollback mechanisms
- [ ] **2.3.5** Implement state consistency validation

### Phase 3: WebSocket Integration

#### Task 3.1: Enhanced WebSocket Server

- [ ] **3.1.1** Extend existing WebSocket server for EngineState events
- [ ] **3.1.2** Implement client authentication and session management
- [ ] **3.1.3** Add connection pooling and load balancing
- [ ] **3.1.4** Create message queuing and delivery system
- [ ] **3.1.5** Implement connection health monitoring

#### Task 3.2: Event Broadcasting

- [ ] **3.2.1** Create event broadcasting to all connected clients
- [ ] **3.2.2** Implement client-specific event filtering
- [ ] **3.2.3** Add event acknowledgment and retry mechanisms
- [ ] **3.2.4** Create event compression and optimization
- [ ] **3.2.5** Implement event rate limiting and throttling

#### Task 3.3: Connection Management

- [ ] **3.3.1** Enhance connection state management
- [ ] **3.3.2** Implement automatic reconnection strategies
- [ ] **3.3.3** Add connection quality monitoring
- [ ] **3.3.4** Create connection load balancing
- [ ] **3.3.5** Implement graceful connection termination

### Phase 4: Frontend State Management

#### Task 4.1: EngineState Hook Implementation

- [ ] **4.1.1** Create `useEngineState` hook for centralized state management
- [ ] **4.1.2** Implement WebSocket event subscription and handling
- [ ] **4.1.3** Add state synchronization and conflict resolution
- [ ] **4.1.4** Create offline state management and caching
- [ ] **4.1.5** Implement state persistence and recovery

#### Task 4.2: Component State Integration

- [ ] **4.2.1** Update container components to use EngineState
- [ ] **4.2.2** Update image components to use EngineState
- [ ] **4.2.3** Update volume components to use EngineState
- [ ] **4.2.4** Update network components to use EngineState
- [ ] **4.2.5** Implement real-time UI updates and animations

#### Task 4.3: Data Provider Migration

- [ ] **4.3.1** Migrate from `useDataProvider` to `useEngineState`
- [ ] **4.3.2** Remove polling-based refresh mechanisms
- [ ] **4.3.3** Implement optimistic updates for user actions
- [ ] **4.3.4** Add error handling and fallback mechanisms
- [ ] **4.3.5** Create migration utilities and backward compatibility

### Phase 5: Performance and Optimization

#### Task 5.1: Memory and Performance Optimization

- [ ] **5.1.1** Optimize EngineState memory usage
- [ ] **5.1.2** Implement efficient event serialization
- [ ] **5.1.3** Add event batching and compression
- [ ] **5.1.4** Create background processing for heavy operations
- [ ] **5.1.5** Implement lazy loading and pagination

#### Task 5.2: Scalability Improvements

- [ ] **5.2.1** Support for large numbers of containers (1000+)
- [ ] **5.2.2** Implement efficient event filtering
- [ ] **5.2.3** Add client-side event processing
- [ ] **5.2.4** Create distributed state management
- [ ] **5.2.5** Implement state partitioning and sharding

## Technical Implementation Details

### Backend EngineState Structure

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineState {
    // Core state
    pub containers: HashMap<String, Container>,
    pub images: HashMap<String, Image>,
    pub volumes: HashMap<String, Volume>,
    pub networks: HashMap<String, Network>,

    // System information
    pub engine_info: EngineInfo,
    pub system_stats: SystemStats,

    // Metadata
    pub version: u64,
    pub last_updated: DateTime<Utc>,
    pub change_history: Vec<StateChange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum StateChange {
    ContainerCreated { id: String, container: Container },
    ContainerUpdated { id: String, changes: ContainerDiff },
    ContainerRemoved { id: String },
    ImagePulled { id: String, image: Image },
    ImageRemoved { id: String },
    VolumeCreated { name: String, volume: Volume },
    VolumeRemoved { name: String },
    NetworkCreated { id: String, network: Network },
    NetworkRemoved { id: String },
}
```

### WebSocket Event System

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum WebSocketEvent {
    // State events
    StateUpdate { changes: Vec<StateChange> },
    FullStateSync { state: EngineState },

    // System events
    EngineStatusChanged { status: EngineState },
    SystemStatsUpdate { stats: SystemStats },

    // Control events
    Subscribe { filters: Vec<EventFilter> },
    Unsubscribe { subscription_id: String },
    Heartbeat { timestamp: DateTime<Utc> },
}
```

### Frontend State Management

```typescript
export function useEngineState() {
  const [state, setState] = useState<EngineState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // WebSocket event handling
  const handleStateUpdate = useCallback((changes: StateChange[]) => {
    setState(prevState => applyChanges(prevState, changes));
    setLastUpdate(new Date());
  }, []);

  // State accessors
  const containers = useMemo(() => state?.containers || {}, [state]);
  const images = useMemo(() => state?.images || {}, [state]);
  const volumes = useMemo(() => state?.volumes || {}, [state]);
  const networks = useMemo(() => state?.networks || {}, [state]);

  return {
    state,
    containers,
    images,
    volumes,
    networks,
    isConnected,
    lastUpdate,
    // ... other state management methods
  };
}
```

## Migration Strategy

### Phase 1: Parallel Implementation

- Implement EngineState alongside existing data providers
- Maintain backward compatibility
- Test WebSocket events without affecting UI

### Phase 2: Gradual Migration

- Migrate one component type at a time (containers → images → volumes → networks)
- Use feature flags for gradual rollout
- Monitor performance and stability

### Phase 3: Complete Transition

- Remove all polling-based data providers
- Clean up legacy code
- Optimize and finalize implementation

## Testing Strategy

### Unit Testing

- EngineState operations and consistency
- Event processing and broadcasting
- State change validation and application

### Integration Testing

- WebSocket event flow end-to-end
- State synchronization between backend and frontend
- Docker event integration

### Performance Testing

- Large-scale container management (1000+ containers)
- High-frequency event processing
- Memory usage and CPU performance
- WebSocket connection stability

### User Experience Testing

- Real-time update responsiveness
- Connection loss and recovery
- Offline state management
- UI update smoothness

## Acceptance Criteria

### Functional Requirements

- [ ] EngineState successfully maintains all Docker entity information
- [ ] Real-time updates work for all Docker operations
- [ ] WebSocket events are properly broadcasted and received
- [ ] State synchronization works between backend and frontend
- [ ] All existing functionality is preserved during migration

### Performance Requirements

- [ ] Memory usage increase < 20MB for EngineState overhead
- [ ] CPU usage increase < 10% for real-time processing
- [ ] WebSocket event latency < 50ms
- [ ] Support for 1000+ containers without performance degradation
- [ ] Efficient event filtering and processing

### User Experience Requirements

- [ ] Instant updates for all Docker operations
- [ ] Smooth UI transitions and animations
- [ ] Clear connection status indicators
- [ ] Graceful handling of connection issues
- [ ] No UI freezing during updates

### Technical Requirements

- [ ] Clean separation of concerns between state management and UI
- [ ] Comprehensive error handling and recovery
- [ ] Proper TypeScript types and interfaces
- [ ] Comprehensive logging and debugging capabilities
- [ ] Backward compatibility during migration

## Dependencies and Prerequisites

### Required Dependencies

- `tokio` - Async runtime for Rust
- `serde` - Serialization framework
- `chrono` - DateTime handling
- `uuid` - Unique identifier generation
- `tracing` - Logging and instrumentation

### Existing Infrastructure

- Tauri WebSocket plugin integration
- Docker event monitoring system
- Frontend WebSocket hooks
- Component architecture

## Risk Assessment

### High Risk

- **State consistency**: Complex state management could lead to inconsistencies
- **Performance impact**: Real-time processing might affect application performance
- **Migration complexity**: Large-scale refactoring could introduce bugs

### Medium Risk

- **WebSocket stability**: Connection issues could affect user experience
- **Event ordering**: Complex event processing might cause ordering issues
- **Memory usage**: Large state objects could impact memory consumption

### Mitigation Strategies

- Comprehensive testing and validation
- Gradual migration with rollback capabilities
- Performance monitoring and optimization
- Robust error handling and recovery mechanisms

## Timeline and Effort Estimation

### Phase 1: Backend Implementation (4-5 weeks)

- EngineState structure and management
- Event system implementation
- Docker event integration

### Phase 2: WebSocket Integration (3-4 weeks)

- Enhanced WebSocket server
- Event broadcasting system
- Connection management

### Phase 3: Frontend Migration (4-5 weeks)

- State management hooks
- Component integration
- Data provider migration

### Phase 4: Optimization and Testing (3-4 weeks)

- Performance optimization
- Comprehensive testing
- Bug fixes and refinements

**Total Estimated Time**: 14-18 weeks

## Success Metrics

### Performance Metrics

- Reduced API calls by 90%+
- WebSocket event latency < 50ms
- Memory usage increase < 20MB
- CPU usage increase < 10%

### User Experience Metrics

- Real-time update responsiveness
- UI update smoothness
- Connection stability
- Error recovery time

### Technical Metrics

- Code coverage > 90%
- Test pass rate > 95%
- Bug density < 1 per 1000 lines
- Performance regression < 5%

## Definition of Done

- [ ] EngineState struct fully implemented and tested
- [ ] WebSocket event system operational
- [ ] All components migrated to use EngineState
- [ ] Real-time updates working for all Docker operations
- [ ] Performance benchmarks met
- [ ] Comprehensive testing completed
- [ ] Documentation updated
- [ ] Code review completed
- [ ] Migration successfully completed
- [ ] Legacy polling code removed

## Notes

- **Priority**: High - This is a major architectural improvement
- **Complexity**: High - Requires significant refactoring and new infrastructure
- **Impact**: High - Will fundamentally change how data flows through the application
- **Dependencies**: Requires existing WebSocket infrastructure to be stable
- **Testing**: Extensive testing required due to architectural changes
- **Documentation**: Comprehensive documentation needed for new architecture
