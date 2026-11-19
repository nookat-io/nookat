# [ENGINE-009] Support Apple container as an additional engine on macOS

- **Status:** Not started
- **Related:** DIST-013, CONTAINER-008, UX-004, TRAY-005, ENGINE-008, MODEL-001, #30

## Problem

Apple's `container` became a real way to run Linux containers on a Mac, and Nookat cannot show it.
Version 1.0.0 shipped on 2026-06-09 and 1.7.1 is current (2026-11-06).
It is open source (Apache-2.0), runs every container in its own lightweight VM on Virtualization.framework, and since 1.0 adds `container machine` for persistent Linux environments.
It has no GUI, which coverage of the 1.0 release names as a gap Docker Desktop does not have.
Users who pick it cannot use Nookat today.

## Current state

- Nookat speaks only the Docker Engine API through bollard and builds its state from Docker events (`src-tauri/src/services/engine_state_monitor.rs`).
- `container` has its own CLI and an XPC API (`container-apiserver`), with no Docker API and no Compose.
- `connect_to_docker` in `src-tauri/src/services/engine/mod.rs` tries `DOCKER_HOST`, then the Docker contexts with the current one first, then `/var/run/docker.sock`, the same order as the Docker CLI.
- The Containers page offers Pause and Unpause, for one container and in bulk (`pause_container` and `bulk_pause_containers` in `src-tauri/src/handlers/containers.rs`).
- The creation wizard sets one network at create time (`NetworkingConfig` in `src-tauri/src/services/container_creation/request.rs`) and offers no privileged option.
- Engine Settings, the engine actions and the VM resources assume Colima on macOS.
- #30 asked for Apple Containerization support when the project was still 0.x and nothing translated it into the Docker API.

## Scope

Support Apple container through socktainer, without a native backend, and make Nookat honest about what that engine can and cannot do.

### Establish the baseline end to end

- On an Apple silicon Mac with macOS 26, install Apple container and socktainer, run `container system start` and socktainer, and make the `socktainer` context current.
- Walk through every page and every action in Nookat, and record for each whether it works, fails, or shows wrong data.
  Include the network the creation wizard sets at create time.
- That list sets the rest of the scope, and its failures become tests.

### Recognise the engine

- Detect that the connected engine is Apple container behind socktainer from `/info` or `/version`, using the fields the baseline shows to tell it apart.
- Show "Apple container" in the header and in Engine Status.
- Hide the Colima VM resources and actions in Engine Settings for this engine, since Apple container has no shared VM.

### Describe what the engine can do

- Add engine capabilities to `EngineState` in `src-tauri/src/entities/engine_state.rs` and `src/types/engine-state.ts`: pausing containers, connecting networks to existing containers, and running privileged containers.
  All of them are true for Docker engines.
- Hide or disable Pause and Unpause, for one container and in bulk, with a short explanation instead of a failure.
- Gate connecting extra networks after creation on the capability, so CONTAINER-008's multi-network creation does not silently drop networks on this engine.
- Turn socktainer's "not supported" responses that still reach Nookat into messages that name the engine.

### Choose the engine

- List the engines Nookat can reach: the Nookat Engine from DIST-013, and Docker Desktop, OrbStack or socktainer found in the Docker contexts.
- Let the user pick the engine Nookat shows.
  Switching it in Nookat does not change the user's current Docker context unless the user asks for that.

### Guide the setup

- When the Mac qualifies (Apple silicon, macOS 26 or later) and Apple container is installed but socktainer is not running, explain how to start it.
- Do not install Apple container or socktainer from Nookat in this task.
  Both are installer packages that ask for an administrator password, write to `/usr/local` and release on their own schedule.

### Done when

- With Apple container 1.7.x and socktainer 1.6.x on Apple silicon with macOS 26, Nookat lists, inspects, starts, stops and removes containers, and shows their logs, stats and terminal.
- On that engine it pulls, removes and prunes images, manages volumes and creates networks.
- State updates arrive through `/events` as they do with Docker.
- No action fails with a raw "not supported" error: what the engine lacks is hidden or disabled with an explanation.
- Switching between the Nookat Engine and Apple container works without restarting Nookat.
- Nothing changes on Intel Macs or on macOS below 26.

## Notes

- socktainer (Apache-2.0, v1.6.1 from 2026-11-09) serves the Docker Engine API v1.51 on `~/.socktainer/container.sock` and registers a `socktainer` Docker context when it starts.
  - Its parity page lists as supported: containers (list, inspect, create, start, stop, remove, logs, stats, exec, attach), images (list, pull, remove, build, prune), volumes, network create, `/events`, `/system/df`, `/info` and `/version`.
  - `/networks/{id}/connect` answers success without doing anything, because Apple container cannot attach a network to an existing container.
  - Pause, unpause and `--privileged` are not supported.
  - It needs Apple silicon, and its README says both socktainer and Apple container are under heavy development.
- Since `connect_to_docker` follows the Docker contexts, Nookat should reach Apple container once `socktainer` is the current context, but that is not verified yet.
- The Apple container README asks for a Mac with Apple silicon and macOS 26 or later, installs from a signed package into `/usr/local` with an administrator password, and keeps the XPC API compatible within a major version.
- Not in this task: a native backend over XPC or the `container` CLI, bundling Apple container or socktainer, managing `container machine` environments, and making Apple container the default engine.
- Alternatives considered:
  - Replace Colima with Apple container.
    It needs Apple silicon and macOS 26 while Nookat supports Intel and macOS 11, and it has no Compose, `--privileged` or pause.
    Its system-wide installer contradicts the bundled engine of DIST-013, and Colima also provides k3s and `colima model` for MODEL-001.
    Per-container VMs start about 4 times slower from cold than Docker Desktop in published benchmarks, and are slower with small files.
  - A native backend over XPC: it needs a Swift sidecar and a second implementation of every service behind a runtime abstraction, including the state monitor.
    Reconsider it only if socktainer stops being enough.
  - Wait for Apple to add a Docker API or Compose: there is no timeline, and the Compose discussion has more than 150 replies without one.
- Revisit this decision when Apple adds a Docker API or Compose, or when socktainer's parity changes.
- Sources: https://github.com/apple/container, https://github.com/socktainer/socktainer, https://socktainer.github.io/docs/api-feature-parity, https://cloudnativenow.com/features/apple-ships-stable-1-0-of-its-native-container-tool-for-macos/, and https://github.com/suruseas/opossum for a Compose subset on Apple container.
