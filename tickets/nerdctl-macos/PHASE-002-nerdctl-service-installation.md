# Phase 2: nerdctl Service and Installation System

## Overview

Implement the nerdctl service that handles installation, management, and configuration of nerdctl on macOS, following the established patterns from the Lima VM service.

## Description

This phase implements the core nerdctl functionality including:

- Binary download and installation with checksum verification
- VM configuration and startup management
- Docker context integration
- Health monitoring and status management

## Technical Requirements

### Backend (Rust)

#### New Service: `NerdctlService`

```rust
pub struct NerdctlService {
    download_client: reqwest::Client,
    config: NerdctlConfig,
}

impl NerdctlService {
    // Core installation methods
    pub async fn install_nerdctl(&self, config: &InstallConfig) -> Result<InstallResult, String>
    pub async fn uninstall_nerdctl(&self) -> Result<bool, String>
    pub async fn upgrade_nerdctl(&self, target_version: &str) -> Result<bool, String>

    // VM management
    pub async fn start_nerdctl_vm(&self, config: &VMConfig) -> Result<bool, String>
    pub async fn stop_nerdctl_vm(&self) -> Result<bool, String>
    pub async fn get_nerdctl_vm_status(&self) -> Result<VMStatus, String>

    // Configuration management
    pub async fn configure_docker_context(&self) -> Result<bool, String>
    pub async fn get_nerdctl_config(&self) -> Result<NerdctlConfig, String>
    pub async fn update_nerdctl_config(&self, config: &NerdctlConfig) -> Result<bool, String>
}
```

#### New Entities

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NerdctlConfig {
    pub version: String,
    pub install_path: String,
    pub vm_config: VMConfig,
    pub docker_context_name: String,
    pub auto_start: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VMConfig {
    pub cpu_count: u8,
    pub memory_gb: u8,
    pub disk_gb: u32,
    pub architecture: String,
    pub vm_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallConfig {
    pub target_version: String,
    pub install_path: Option<String>,
    pub vm_config: VMConfig,
    pub create_docker_context: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallResult {
    pub success: bool,
    pub message: String,
    pub install_path: Option<String>,
    pub vm_name: Option<String>,
    pub docker_context_configured: bool,
    pub logs: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum VMStatus {
    NotCreated,
    Stopped,
    Starting,
    Running,
    Stopping,
    Error,
}
```

#### New Handlers

```rust
#[tauri::command]
pub async fn install_nerdctl(config: InstallConfig) -> Result<InstallResult, String>

#[tauri::command]
pub async fn uninstall_nerdctl() -> Result<bool, String>

#[tauri::command]
pub async fn start_nerdctl_vm(config: VMConfig) -> Result<bool, String>

#[tauri::command]
pub async fn stop_nerdctl_vm() -> Result<bool, String>

#[tauri::command]
pub async fn get_nerdctl_status() -> Result<VMStatus, String>

#[tauri::command]
pub async fn configure_nerdctl_docker_context() -> Result<bool, String>

#[tauri::command]
pub async fn get_nerdctl_config() -> Result<NerdctlConfig, String>
```

#### Installation Orchestrator

```rust
pub struct NerdctlInstaller {
    download_client: reqwest::Client,
    progress_callback: Box<dyn Fn(InstallProgress) + Send + Sync>,
}

impl NerdctlInstaller {
    pub async fn install_binary(&self, config: &InstallConfig) -> Result<Vec<u8>, String>
    pub async fn verify_checksum(&self, data: &[u8], expected: &str) -> Result<bool, String>
    pub async fn install_to_system(&self, binary: &[u8], path: &str) -> Result<bool, String>
    pub async fn setup_nerdctl_directories(&self) -> Result<bool, String>
    pub async fn start_nerdctl_daemon(&self, config: &VMConfig) -> Result<bool, String>
}
```

### Frontend (TypeScript)

#### New Hook: `useNerdctlService`

```typescript
export const useNerdctlService = () => {
  const [status, setStatus] = useState<VMStatus>('NotCreated');
  const [config, setConfig] = useState<NerdctlConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const install = async (config: InstallConfig) => {
    /* implementation */
  };
  const startVM = async (vmConfig: VMConfig) => {
    /* implementation */
  };
  const stopVM = async () => {
    /* implementation */
  };
  const configureDockerContext = async () => {
    /* implementation */
  };

  return {
    status,
    config,
    loading,
    error,
    install,
    startVM,
    stopVM,
    configureDockerContext,
  };
};
```

#### New Components

- `NerdctlInstallForm`: Installation configuration form
- `NerdctlStatusPanel`: Current status and controls
- `VMConfigurationForm`: VM resource configuration
- `InstallProgressView`: Real-time installation progress

## Implementation Details

### Binary Installation Flow

1. **Download Process**:
   - Download nerdctl binary from GitHub releases
   - Verify SHA256 checksum
   - Handle download progress and errors

2. **System Installation**:
   - Install to appropriate system path (`/opt/homebrew/bin` for ARM64, `/usr/local/bin` for x86_64)
   - Set proper executable permissions
   - Create necessary directories (`~/.nerdctl`)

3. **VM Configuration**:
   - Generate nerdctl VM configuration
   - Start nerdctl daemon with specified resources
   - Verify VM startup and connectivity

### Docker Context Integration

1. **Context Creation**:
   - Create new Docker context for nerdctl
   - Configure context to point to nerdctl socket
   - Set as default context if requested

2. **Context Management**:
   - Handle existing Docker contexts
   - Provide context switching options
   - Maintain context configuration

### Progress Tracking

1. **Installation Stages**:
   - Download (0-30%)
   - Verification (30-40%)
   - Installation (40-70%)
   - Configuration (70-90%)
   - Validation (90-100%)

2. **Real-time Updates**:
   - Stream installation logs
   - Update progress percentage
   - Show current stage information

## Configuration Management

### Version Pinning

```json
{
  "nerdctl": {
    "version": "1.7.5",
    "checksum": "sha256:abc123...",
    "download_url": "https://github.com/containerd/nerdctl/releases/download/v1.7.5/nerdctl-1.7.5-darwin-arm64.tar.gz"
  },
  "lima": {
    "version": "0.21.0",
    "checksum": "sha256:def456...",
    "download_url": "https://github.com/lima-vm/lima/releases/download/v0.21.0/lima-0.21.0-Darwin-arm64.tar.gz"
  }
}
```

### User Configuration

- VM resource allocation preferences
- Auto-start settings
- Docker context preferences
- Installation path overrides

## Error Handling

### Installation Failures

- Download failures (network issues, invalid URLs)
- Checksum verification failures
- Permission errors during installation
- VM startup failures

### Recovery Mechanisms

- Rollback failed installations
- Retry mechanisms for transient failures
- Clear error messages with resolution steps
- Log collection for troubleshooting

## Security Considerations

### Binary Verification

- SHA256 checksum validation
- Source URL verification
- Quarantine attribute handling on macOS

### Permission Management

- Minimal privilege escalation
- Secure temporary file handling
- Proper cleanup of sensitive data

## Acceptance Criteria

### Functional Requirements

- [ ] nerdctl binary installation completes successfully
- [ ] VM starts with specified resource configuration
- [ ] Docker context is properly configured
- [ ] Installation progress is tracked and displayed
- [ ] Error handling covers all failure scenarios
- [ ] Uninstall and upgrade functionality works

### Technical Requirements

- [ ] Service follows existing Lima VM patterns
- [ ] All operations are properly async
- [ ] Progress tracking provides real-time updates
- [ ] Configuration is persistent and manageable
- [ ] Security best practices are followed

### Performance Requirements

- [ ] Installation completes within reasonable time
- [ ] Progress updates are responsive
- [ ] Resource usage during installation is acceptable

## Dependencies

- Phase 1: Engine Detection Infrastructure
- Existing Lima VM service patterns
- reqwest for HTTP downloads
- tokio for async operations
- Tauri IPC system

## Definition of Done

- [ ] nerdctl service fully implemented
- [ ] Installation flow works end-to-end
- [ ] VM management functionality complete
- [ ] Docker context integration working
- [ ] Progress tracking and error handling implemented
- [ ] Configuration management system complete
- [ ] All tests passing
- [ ] Documentation updated

## Notes

- Follow existing Lima VM service patterns closely
- Ensure proper error handling and user feedback
- Consider future extensibility for other engines
- Test on both ARM64 and x86_64 macOS systems
