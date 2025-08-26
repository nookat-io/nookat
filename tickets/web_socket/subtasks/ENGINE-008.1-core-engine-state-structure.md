# ENGINE-008.1: Core EngineState Structure Implementation

## Overview

Implement the foundational `EngineState` struct that will serve as the centralized state container for all Docker engine information. This is the first step in transitioning from polling-based data fetching to real-time WebSocket updates.

## Description

Create the core `EngineState` struct in Rust that will maintain the complete state of the Docker engine, including containers, images, volumes, networks, and system information. This struct will be the foundation for all subsequent WebSocket-based real-time updates.

## Current State

- ✅ Basic WebSocket infrastructure exists
- ❌ No centralized state management
- ❌ Data scattered across multiple providers
- ❌ No change tracking or event system

## Entity Coverage Analysis

After examining all handler files, the following entity types are currently being sent to the frontend and must be included in EngineState:

### Core Docker Entities

- **Container** - Full CRUD operations, bulk operations, logs, terminal access
- **Image** - Listing, pruning operations with PruneResult tracking
- **Volume** - Listing, inspection, removal, bulk operations
- **Network** - Listing, removal, bulk operations

### Engine State Entities

- **EngineStatus** - Current engine running state (Docker, Colima, etc.)
- **DockerInfo** - System information, version, platform details
- **PruneResult** - Cleanup operation results for images, containers, volumes

### Configuration Entities

- **AppConfig** - Application settings, theme, language, telemetry
- **EngineInfo** - Engine-specific configuration and status

### Missing from Current EngineState Design

- Engine status tracking and updates
- Docker info management
- Prune operation result tracking
- Configuration state management

## Technical Requirements

### Core Structure

- `EngineState` struct with all Docker entity collections
- Atomic state update methods
- State validation and consistency checks
- Serialization support for WebSocket transmission

### Data Collections

- `HashMap<String, Container>` for container management
- `HashMap<String, Image>` for image management
- `HashMap<String, Volume>` for volume management
- `HashMap<String, Network>` for network management
- `EngineStatus` for current engine state
- `DockerInfo` for Docker system information

## Implementation Tasks

### Task 1: Create EngineState Module

- [ ] **1.1** Create `src-tauri/src/entities/engine_state.rs`
- [ ] **1.2** Define `EngineState` struct with all required fields
- [ ] **1.3** Implement `Default` trait for EngineState
- [ ] **1.4** Add `Clone` and `Debug` derive macros
- [ ] **1.5** Create basic constructor methods

### Task 2: Implement Core Data Structures

- [ ] **2.1** Add container collection with proper typing
- [ ] **2.2** Add image collection with proper typing
- [ ] **2.3** Add volume collection with proper typing
- [ ] **2.4** Add network collection with proper typing
- [ ] **2.5** Add engine status and Docker info fields
- [ ] **2.6** Add prune result tracking for cleanup operations
- [ ] **2.7** Add system information fields
- [ ] **2.8** Add metadata fields (version, timestamps)

### Task 3: State Management Operations

- [ ] **3.1** Implement `get_container(&self, id: &str)` method
- [ ] **3.2** Implement `get_image(&self, id: &str)` method
- [ ] **3.3** Implement `get_volume(&self, name: &str)` method
- [ ] **3.4** Implement `get_network(&self, id: &str)` method
- [ ] **3.5** Add collection iteration methods
- [ ] **3.6** Implement collection size and status methods

### Task 4: State Update Methods

- [ ] **4.1** Implement `add_container(&mut self, container: Container)` method
- [ ] **4.2** Implement `update_container(&mut self, id: &str, container: Container)` method
- [ ] **4.3** Implement `remove_container(&mut self, id: &str)` method
- [ ] **4.4** Implement similar methods for images, volumes, and networks
- [ ] **4.5** Implement engine status update methods
- [ ] **4.6** Implement Docker info update methods
- [ ] **4.7** Implement prune result tracking methods
- [ ] **4.8** Add atomic update wrapper methods
- [ ] **4.9** Implement batch update operations

### Task 6: Serialization and Integration

- [ ] **6.1** Add `Serialize` and `Deserialize` derive macros
- [ ] **6.2** Implement custom serialization for efficient WebSocket transmission
- [ ] **6.3** Add state compression and optimization
- [ ] **6.4** Create state export/import methods
- [ ] **6.5** Integrate with existing entity types
- [ ] **6.6** Add module to `src-tauri/src/entities/mod.rs`

## Technical Implementation

### EngineState Structure

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineState {
    // Core collections
    pub containers: HashMap<String, Container>,
    pub images: HashMap<String, Image>,
    pub volumes: HashMap<String, Volume>,
    pub networks: HashMap<String, Network>,

    // Engine state information
    pub engine_status: EngineStatus,
    pub docker_info: Option<DockerInfo>,

    // Prune operations tracking
    pub last_prune_results: HashMap<String, PruneResult>,

    // System information
    pub system_stats: SystemStats,

    // Metadata
    pub version: u64,
    pub last_updated: DateTime<Utc>,
}
```

### Core Methods

```rust
impl EngineState {
    // Constructors
    pub fn new() -> Self
    pub fn with_engine_info(engine_info: EngineInfo) -> Self

    // Container management
    pub fn get_container(&self, id: &str) -> Option<&Container>
    pub fn add_container(&mut self, container: Container) -> Result<(), String>
    pub fn update_container(&mut self, id: &str, container: Container) -> Result<(), String>
    pub fn remove_container(&mut self, id: &str) -> Result<Container, String>

    // Similar methods for images, volumes, networks

    // Engine state methods
    pub fn get_engine_status(&self) -> &EngineStatus
    pub fn update_engine_status(&mut self, status: EngineStatus) -> Result<(), String>
    pub fn get_docker_info(&self) -> Option<&DockerInfo>
    pub fn update_docker_info(&mut self, info: DockerInfo) -> Result<(), String>

    // Prune operations methods
    pub fn get_prune_result(&self, operation: &str) -> Option<&PruneResult>
    pub fn update_prune_result(&mut self, operation: String, result: PruneResult) -> Result<(), String>

    // State operations
    pub fn get_version(&self) -> u64
    pub fn get_last_updated(&self) -> DateTime<Utc>

    // Utility methods
    pub fn is_empty(&self) -> bool
    pub fn total_entities(&self) -> usize
    pub fn get_stats(&self) -> EngineStateStats
}
```

## Dependencies

### Required Crates

- `serde` - Serialization framework
- `chrono` - DateTime handling
- `uuid` - Unique identifier generation
- `tracing` - Logging and instrumentation

### Existing Dependencies

- `Container`, `Image`, `Volume`, `Network` entity types
- `EngineStatus`, `EngineInfo`, `DockerInfo` types
- `PruneResult` type for cleanup operations
- `SystemStats` type

## Testing Requirements

### Unit Tests

- [ ] **Test 1** EngineState creation and initialization
- [ ] **Test 2** Container CRUD operations
- [ ] **Test 3** Image CRUD operations
- [ ] **Test 4** Volume CRUD operations
- [ ] **Test 5** Network CRUD operations
- [ ] **Test 6** Engine status and Docker info management
- [ ] **Test 7** Prune operations tracking
- [ ] **Test 9** Serialization and deserialization
- [ ] **Test 10** State validation and consistency

### Integration Tests

- [ ] **Test 9** Integration with existing entity types
- [ ] **Test 10** State persistence and recovery
- [ ] **Test 11** Performance with large datasets

## Acceptance Criteria

- [ ] `EngineState` struct successfully compiles
- [ ] All CRUD operations work correctly for all entity types
- [ ] Serialization/deserialization works without data loss
- [ ] Unit tests pass with >90% coverage
- [ ] Integration tests pass successfully
- [ ] Performance benchmarks met (creation, updates, queries)

## Definition of Done

- [ ] EngineState struct fully implemented
- [ ] All required methods implemented and tested
- [ ] Serialization working correctly
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Code review completed
- [ ] Documentation updated

## Estimated Effort

## Notes

- **Priority**: High - Foundation for all subsequent work
- **Dependencies**: Requires existing entity types to be stable
- **Risk**: Low - Self-contained implementation
- **Testing**: Comprehensive testing required for foundation
- **Documentation**: Clear API documentation needed for team use
