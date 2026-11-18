# [TECH-002] Test the backend against a real Docker daemon

- **Status:** Partially done
- **Related:** TECH-001, TECH-003

## Problem

Nothing tests the services against a real Docker engine.
A bollard upgrade or a daemon behaving differently from what the code expects (for example the volume prune bug in #170) only shows up in manual testing.

## Current state

- 15 frontend test files render components with Tauri IPC mocked through `mockIPC` from `@tauri-apps/api/mocks`, for example `src/components/containers/create/create-container-dialog.test.tsx`.
  They test the frontend and the command contract, not the backend.
- Rust tests in `src-tauri/src` are unit tests that don't need an engine.
  The one integration-style fixture is a local HTTP server that fakes GitHub releases for the binary installer (`src-tauri/src/services/binary_install/test_fixtures.rs`).
- No test talks to a Docker daemon, and there is no `src-tauri/tests/` directory.

## Scope

- Add integration tests for `ContainersService`, `ImagesService`, `VolumesService` and `NetworksService` that run against a real engine through bollard.
  Cover create, start, stop, remove, prune, network creation and the engine state snapshot that `src-tauri/src/services/engine_state_monitor.rs` builds.
- Run them in a CI job on `ubuntu` runners, which have Docker preinstalled.
- Keep them out of the default `cargo test` run (an `#[ignore]` attribute or a feature flag), so local runs without Docker still pass.
- Give every test its own labelled resources and clean them up even when the test fails.

## Notes

- Use small, pinned images such as `alpine` or `busybox` to keep the job fast.
- Colima itself (the macOS engine flow) can't run on Linux runners; testing it needs a macOS runner with virtualization and is out of scope here.
- Whole user flows through the UI belong to TECH-003.
