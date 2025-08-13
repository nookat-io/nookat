## Overview

Implement a bundled distribution option for macOS that installs and configures a Docker-compatible runtime via [nerdctl](https://github.com/containerd/nerdctl). If no Docker Engine/runtime is available, Nookat offers an in-app GUI flow to install nerdctl using **direct binary** (scripted) installation. The flow tracks progress, validates the setup, and configures Nookat to use the nerdctl.

## Description

On macOS, Docker Engine does not run natively; common solutions use a docker-compatible CLI (e.g., nerdctl). We will add a guided installer within Nookat for macOS users:

- Detect whether a working Docker runtime is available.
- If not, present a GUI form offering **Binary** installation of nerdctl.
- Execute the chosen path (with elevation where needed), show progress, and validate by running `docker version` against the nerdctl context.
- Persist runtime configuration to ensure Nookat uses nerdctl on subsequent launches.

## nerdctl Integration

We will integrate with **nerdctl** full version (with includes all it's dependencies) rather than [Moby] Desktop on macOS (see #50):

- **Binary path**: Download and install nerdctl and its dependency **nerdctl**, place binaries under the correct folder, and create required directories. Start nerdctl with the same options as above.

We will also set Docker context to nerdctl, or configure `DOCKER_HOST` for the app runtime if needed.

## Technical Requirements

### Frontend

- Add an **Engine Setup** screen shown when Docker runtime is missing or unreachable.
- Options:
  - **Binary install** (scripted).
  - There are will be other options lately to install other engines, like Moby, containerd, etc
- Options panel to choose nerdctl VM parameters (CPU, RAM, Disk, Architecture), with sane defaults and validation.
- **Progress UI** (step-based with logs).
- **Post-install validation UI** (success/failure + diagnostics and retry).

### Backend

- Implement runtime #42:
  - `docker version` and/or `docker context ls` + `nerdctl status`.
- Implement **installer orchestration**:
  - Binary flow:
    - Download checksummed nerdctl and nerdctl releases (version pinned in config).
    - Verify SHA256.
    - Install binaries to appropriate prefix (requires elevation).
    - Run `nerdctl start ...`.
- Implement **privileged execution**:
  - Launch Terminal with a script (user-visible sudo prompts) or use a privileged helper (stretch goal).
- Implement **validation** & configuration:
  - Ensure `docker` CLI talks to nerdctl (`docker version`, `docker info`).
  - Set default docker context to `nerdctl` or configure the app’s `DOCKER_HOST`.
- **Logging + telemetry** for install sessions (local logs).

### Data Flow

1. User launches Nookat on macOS.
2. Nookat checks for a working Docker runtime (Docker socket/context + `docker version`).
3. If missing/unreachable, show **Engine Setup** screen with **Binary** option.
4. After user confirms:
   - Execute chosen installer path (with progress and logs).
   - Start nerdctl VM with selected resources.
5. Validate: `docker version`, `docker info`, ensure `docker context use nerdctl` or set `DOCKER_HOST`.
6. Persist configuration; return user to app.
7. Provide re-run/repair option if validation fails.

## Acceptance Criteria

### Functional Requirements

- [ ] Engine detection accurately identifies existing Docker/nerdctl availability.
- [ ] Binary-based nerdctl installation completes with progress and logs.
- [ ] nerdctl VM starts with user-selected resources (CPU/RAM/Disk/Arch).
- [ ] Post-install validation confirms `docker version` and `docker info` succeed.
- [ ] Nookat uses the nerdctl context automatically after setup.
- [ ] Robust error handling with actionable messages and retry.

### User Experience

- [ ] Clear, guided Engine Setup screen with two install choices (Binary / Other (not-avaliable) ).
- [ ] Reasonable defaults with advanced options expandable.
- [ ] Real-time progress and log view (copyable).
- [ ] Success screen with quick “Test again” button and “Open logs” link.
- [ ] Failure screen provides diagnostics and “Retry” actions.

## Technical Implementation

### Backend Implementation (Rust)

```rust
// Detection:
// - try "docker version" with timeout
// - try "nerdctl status" and "docker context ls"
// - determine if current context points to nerdctl

// Binary installer orchestrator:
// - download pinned releases (nerdctl, nerdctl) to temp dir
// - verify SHA256
// - install to  (arm64) or /usr/local/bin (x86_64) (elevated)
// - ensure executable bits, create necessary dirs (~/.nerdctl)
// - run: nerdctl start with options
// - set docker context or DOCKER_HOST

// Progress & logs:
// - spawn child processes and stream stdout/stderr via Tauri events "engine-install-progress"
// - stepwise progress milestones for % approximation

// Validation:
// - docker version/info must succeed
// - record selected context and config
```

### Frontend Implementation (TypeScript)

```ts
// Views:
// - EngineSetup.vue/tsx: choice Binary vs Other
// - AdvancedOptions: CPU/RAM/Disk/Arch number inputs with validation
// - ProgressView: log stream + step meter
// - ResultView: success/failure with actions

// IPC:
// - invoke("engine_detect")
// - invoke("engine_install", { method: "brew" | "binary", options })
// - listen("engine-install-progress", handler)
// - invoke("engine_validate")
// - invoke("engine_configure")

// Bundle verification UI:
// - display versions (nerdctl, nerdctl, docker cli)
// - show checksum status (for binary path)
```

## Dependencies

- **nerdctl** and **nerdctl** (binary releases for the Binary path).
- **Docker CLI** (via brew or included binary).
- **Tauri** process/IPC for spawning installers and streaming logs.
- macOS elevation (sudo) via Terminal script or helper.

## Bundle Packaging / Release

- Include small **bootstrap scripts** under `bundle.resources/macos/`:
  - `install_nerdctl_binary.sh` (downloads, verifies SHA256, installs to correct prefix; requires sudo).
  - `start_nerdctl.sh` (starts VM with templated options).

- Pin **version matrix** for nerdctl/nerdctl in config (JSON) with their SHA256 checksums.
- Code sign app; notarize bundle as usual (scripts remain resources, executed by shell).

## Security & Validation

- Verify SHA256 of downloaded binaries (Binary path) before installing.
- Show source/origin for downloads in UI.
- Respect macOS Gatekeeper (download with quarantine attributes cleared only after checksum verification and user consent).
- No long-lived root processes; sudo used only for file placement/startup where necessary.

## Definition of Done

- [ ] Engine detection implemented and reliable.
- [ ] Binary install flow works end-to-end with progress, checksum verification, and logs.
- [ ] nerdctl starts with selectable resources; context configured for Nookat.
- [ ] Post-install validation passes and surfaces clear UX.
- [ ] Error handling + retry implemented.
- [ ] Packaged scripts included and release pipeline updated for macOS artifact.

## Notes

- Pin specific nerdctl/nerdctl versions; expose a config to update these without app changes if possible.
