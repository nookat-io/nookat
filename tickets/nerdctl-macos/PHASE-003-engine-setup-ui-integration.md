# Phase 3: Engine Setup UI and Integration

## Overview

Implement the user interface for engine setup, installation, and management, integrating the engine detection and nerdctl services into a cohesive user experience.

## Description

This phase creates the complete user interface flow for:

- Engine detection and status display
- nerdctl installation wizard
- VM configuration and management
- Progress tracking and error handling
- Post-installation validation and configuration

## Technical Requirements

### Frontend (TypeScript/React)

#### New Pages

##### `EngineSetupPage`

Main entry point for engine setup and management

```typescript
const EngineSetupPage: React.FC = () => {
  const { engines, workingEngine, detectEngines } = useEngineDetection();
  const { install, status, loading } = useNerdctlService();

  // Engine detection and setup logic
  // Installation flow orchestration
  // Status display and management
};
```

##### `EngineInstallationWizard`

Multi-step installation wizard for nerdctl

```typescript
const EngineInstallationWizard: React.FC<{
  onComplete: (result: InstallResult) => void;
  onCancel: () => void;
}> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [installConfig, setInstallConfig] = useState<InstallConfig | null>(
    null
  );

  // Step navigation
  // Configuration collection
  // Installation execution
};
```

#### New Components

##### `EngineStatusOverview`

Displays current engine status and health

```typescript
const EngineStatusOverview: React.FC = () => {
  const { engines, workingEngine, refreshStatus } = useEngineDetection()

  return (
    <div className="engine-status-overview">
      <EngineHealthIndicator engine={workingEngine} />
      <EngineStatusGrid engines={engines} />
      <EngineActionButtons onRefresh={refreshStatus} />
    </div>
  )
}
```

##### `EngineInstallationForm`

Configuration form for nerdctl installation

```typescript
const EngineInstallationForm: React.FC<{
  onSubmit: (config: InstallConfig) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [vmConfig, setVmConfig] = useState<VMConfig>(defaultVMConfig);
  const [installOptions, setInstallOptions] = useState<InstallOptions>({});

  // Form validation
  // Configuration management
  // Submission handling
};
```

##### `VMConfigurationPanel`

Advanced VM resource configuration

```typescript
const VMConfigurationPanel: React.FC<{
  config: VMConfig;
  onChange: (config: VMConfig) => void;
}> = ({ config, onChange }) => {
  // CPU, RAM, Disk configuration
  // Architecture selection
  // Validation and constraints
};
```

##### `InstallationProgressView`

Real-time installation progress and logs

```typescript
const InstallationProgressView: React.FC<{
  progress: InstallProgress;
  logs: string[];
}> = ({ progress, logs }) => {
  // Progress bar and stage display
  // Real-time log streaming
  // Error display and handling
};
```

##### `PostInstallValidation`

Post-installation verification and configuration

```typescript
const PostInstallValidation: React.FC<{
  result: InstallResult;
  onConfigure: () => void;
  onTest: () => void;
}> = ({ result, onConfigure, onTest }) => {
  // Success/failure display
  // Configuration options
  // Testing and validation
};
```

#### New Hooks

##### `useEngineSetup`

Orchestrates the complete engine setup flow

```typescript
export const useEngineSetup = () => {
  const [setupState, setSetupState] = useState<SetupState>('detecting');
  const [currentStep, setCurrentStep] = useState<SetupStep>('detection');
  const [installResult, setInstallResult] = useState<InstallResult | null>(
    null
  );

  const startSetup = async () => {
    /* implementation */
  };
  const proceedToInstall = async (config: InstallConfig) => {
    /* implementation */
  };
  const completeSetup = async () => {
    /* implementation */
  };

  return {
    setupState,
    currentStep,
    installResult,
    startSetup,
    proceedToInstall,
    completeSetup,
  };
};
```

##### `useInstallationProgress`

Manages installation progress and real-time updates

```typescript
export const useInstallationProgress = () => {
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const startProgressTracking = () => {
    /* implementation */
  };
  const updateProgress = (update: InstallProgress) => {
    /* implementation */
  };
  const addLogEntry = (entry: string) => {
    /* implementation */
  };

  return {
    progress,
    logs,
    isComplete,
    startProgressTracking,
    updateProgress,
    addLogEntry,
  };
};
```

### UI/UX Design

#### Design System Integration

- Use existing UI components from `src/components/ui/`
- Follow established design patterns and spacing
- Maintain consistency with existing pages

#### Responsive Design

- Mobile-first approach for all components
- Adaptive layouts for different screen sizes
- Touch-friendly interactions for mobile devices

#### Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

### State Management

#### Local State

- Form data and validation state
- Installation progress and logs
- Error states and messages
- Step navigation state

#### Global State Integration

- Engine detection results
- nerdctl service status
- User preferences and settings
- Installation history

## Implementation Details

### Page Flow

1. **Engine Detection** (`/engine-setup`)
   - Auto-detect available engines
   - Display current status
   - Show setup options

2. **Installation Wizard** (`/engine-setup/install`)
   - Step 1: Configuration
   - Step 2: Installation
   - Step 3: Validation

3. **Post-Install** (`/engine-setup/complete`)
   - Success/failure display
   - Configuration options
   - Testing and validation

### Component Architecture

```
EngineSetupPage
├── EngineStatusOverview
│   ├── EngineHealthIndicator
│   ├── EngineStatusGrid
│   └── EngineActionButtons
├── EngineInstallationWizard (conditional)
│   ├── EngineInstallationForm
│   │   ├── VMConfigurationPanel
│   │   └── InstallationOptions
│   ├── InstallationProgressView
│   └── PostInstallValidation
└── EngineManagementPanel (conditional)
    ├── NerdctlStatusPanel
    ├── VMControls
    └── ConfigurationOptions
```

### Real-time Updates

#### Progress Streaming

- WebSocket or Tauri event-based updates
- Real-time progress bar updates
- Live log streaming with auto-scroll
- Stage transition animations

#### Status Synchronization

- Automatic status refresh
- Background health checks
- Real-time engine status updates
- Error state monitoring

### Error Handling

#### User-Friendly Messages

- Clear error descriptions
- Actionable resolution steps
- Context-aware error display
- Recovery option suggestions

#### Error Recovery

- Retry mechanisms
- Rollback options
- Diagnostic information
- Support contact details

## Integration Points

### Backend Integration

- Tauri IPC commands for all operations
- Real-time event listening for progress
- Error handling and status updates
- Configuration persistence

### Existing System Integration

- Navigation integration with main app
- Settings page integration
- Analytics and telemetry
- Theme and localization support

### External Services

- GitHub releases for binary downloads
- Checksum verification services
- Docker context management
- System integration APIs

## User Experience Flow

### First-Time Setup

1. User launches app without Docker
2. Automatic engine detection runs
3. Engine setup page is displayed
4. Installation wizard guides user through setup
5. Post-install validation confirms success
6. User returns to main app with working engine

### Engine Management

1. User accesses engine setup from settings
2. Current engine status is displayed
3. Management options are provided
4. Configuration changes are applied
5. Status updates are reflected in real-time

### Error Scenarios

1. Installation failure detection
2. Clear error message display
3. Recovery option presentation
4. Retry mechanism availability
5. Support information access

## Acceptance Criteria

### Functional Requirements

- [ ] Engine setup page displays current engine status
- [ ] Installation wizard guides users through setup process
- [ ] Real-time progress tracking works during installation
- [ ] Post-install validation confirms successful setup
- [ ] Error handling provides clear user guidance
- [ ] All UI components are responsive and accessible

### Technical Requirements

- [ ] Components integrate with existing design system
- [ ] State management follows established patterns
- [ ] Real-time updates work reliably
- [ ] Error handling covers all failure scenarios
- [ ] Performance is acceptable for all operations

### User Experience Requirements

- [ ] Setup flow is intuitive and guided
- [ ] Progress feedback is clear and informative
- [ ] Error messages are actionable
- [ ] Interface is responsive and accessible
- [ ] Integration with main app is seamless

## Dependencies

- Phase 1: Engine Detection Infrastructure
- Phase 2: nerdctl Service and Installation System
- Existing UI component library
- Tauri IPC system
- React state management patterns

## Definition of Done

- [ ] All new pages and components implemented
- [ ] Installation wizard flow works end-to-end
- [ ] Real-time progress tracking implemented
- [ ] Error handling and recovery complete
- [ ] UI integration with main app complete
- [ ] Responsive design and accessibility verified
- [ ] All tests passing
- [ ] User acceptance testing complete

## Notes

- Focus on user experience and flow clarity
- Ensure consistent design language with existing app
- Test on various screen sizes and devices
- Consider future extensibility for other engines
- Maintain performance during real-time updates
