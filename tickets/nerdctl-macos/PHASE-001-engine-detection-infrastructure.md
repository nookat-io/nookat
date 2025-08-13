# Phase 1: Engine Detection Infrastructure

## Overview

Implement the core engine detection service that can identify whether a working Docker runtime is available on macOS, including detection of existing Docker Engine, nerdctl, and other container runtimes.

## Description

Before implementing the nerdctl installation flow, we need a robust engine detection system that can:

- Detect existing Docker Engine availability
- Identify nerdctl installations and their status
- Determine the current Docker context configuration
- Provide a unified interface for engine status across the application

## Technical Requirements

### Backend (Rust)

#### New Service: `EngineDetectionService`

```rust
pub struct EngineDetectionService {}

impl EngineDetectionService {
    // Detect all available container engines
    pub async fn detect_available_engines() -> Result<Vec<EngineInfo>, String>

    // Check if any engine is currently working
    pub async fn get_working_engine() -> Result<Option<EngineInfo>, String>

    // Test specific engine connectivity
    pub async fn test_engine_connectivity(engine: &EngineType) -> Result<bool, String>

    // Get current Docker context information
    pub async fn get_docker_context_info() -> Result<DockerContextInfo, String>
}
```

#### New Entities

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EngineType {
    DockerEngine,
    Nerdctl,
    LimaVM,
    Podman,
    Other(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineInfo {
    pub engine_type: EngineType,
    pub status: EngineStatus,
    pub version: Option<String>,
    pub install_path: Option<String>,
    pub is_working: bool,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EngineStatus {
    NotInstalled,
    Installed,
    Running,
    Stopped,
    Error,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerContextInfo {
    pub current_context: Option<String>,
    pub available_contexts: Vec<String>,
    pub default_context: Option<String>,
    pub context_details: HashMap<String, ContextDetail>,
}
```

#### New Handlers

```rust
#[tauri::command]
pub async fn detect_engines() -> Result<Vec<EngineInfo>, String>

#[tauri::command]
pub async fn get_working_engine() -> Result<Option<EngineInfo>, String>

#[tauri::command]
pub async fn test_engine(engine_type: String) -> Result<bool, String>

#[tauri::command]
pub async fn get_docker_contexts() -> Result<DockerContextInfo, String>
```

### Frontend (TypeScript)

#### New Hook: `useEngineDetection`

```typescript
export const useEngineDetection = () => {
  const [engines, setEngines] = useState<EngineInfo[]>([]);
  const [workingEngine, setWorkingEngine] = useState<EngineInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectEngines = async () => {
    /* implementation */
  };
  const testEngine = async (engineType: string) => {
    /* implementation */
  };
  const refreshStatus = async () => {
    /* implementation */
  };

  return {
    engines,
    workingEngine,
    loading,
    error,
    detectEngines,
    testEngine,
    refreshStatus,
  };
};
```

#### New Components

- `EngineStatusCard`: Display individual engine status
- `EngineDetectionPanel`: Main panel showing all detected engines
- `EngineHealthIndicator`: Visual indicator of engine health

## Implementation Details

### Engine Detection Logic

1. **Docker Engine Detection**:
   - Try `docker version` command
   - Check Docker socket availability
   - Verify Docker context configuration

2. **nerdctl Detection**:
   - Check for nerdctl binary in PATH
   - Verify nerdctl daemon status
   - Test nerdctl connectivity

3. **Lima VM Detection**:
   - Leverage existing Lima VM service
   - Check Lima VM status and connectivity

4. **Context Analysis**:
   - Parse `docker context ls` output
   - Identify current active context
   - Map contexts to engine types

### Error Handling

- Timeout handling for slow responses
- Graceful degradation when commands fail
- Clear error messages for troubleshooting
- Retry mechanisms for transient failures

### Performance Considerations

- Cache engine detection results
- Implement background health checks
- Use async operations for non-blocking detection
- Debounce rapid detection requests

## Acceptance Criteria

### Functional Requirements

- [ ] Engine detection service accurately identifies all available container engines
- [ ] Service can determine which engine is currently working
- [ ] Docker context information is properly parsed and exposed
- [ ] All detection methods handle errors gracefully
- [ ] Service provides real-time status updates

### Technical Requirements

- [ ] New service follows existing code patterns and architecture
- [ ] All new entities are properly serializable
- [ ] Handlers are properly integrated with Tauri IPC
- [ ] Service includes comprehensive error handling
- [ ] Performance is acceptable for real-time updates

### Testing Requirements

- [ ] Unit tests for all detection methods
- [ ] Integration tests with mock engines
- [ ] Error scenario testing
- [ ] Performance testing with multiple engines

## Dependencies

- Existing Lima VM service (for Lima VM detection)
- Tauri IPC system
- Standard library process execution
- Async runtime (tokio)

## Definition of Done

- [ ] Engine detection service implemented and tested
- [ ] All new entities and handlers created
- [ ] Frontend hook and components implemented
- [ ] Integration with existing Lima VM service complete
- [ ] Comprehensive error handling implemented
- [ ] Unit and integration tests passing
- [ ] Documentation updated

## Notes

- This phase focuses on detection only, not installation
- Leverage existing Lima VM patterns where possible
- Ensure the service is extensible for future engine types
- Consider caching strategies for performance optimization
