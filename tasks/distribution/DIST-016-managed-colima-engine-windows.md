# [DIST-016] Install and run Colima as the managed engine on Windows

- **Status:** Blocked
- **Blocked by:** Colima has no Windows release yet; the latest, v0.10.3 from 2026-06-04, ships only macOS and Linux binaries.
- **Related:** #56, DIST-001, DIST-005, DIST-013, DIST-015

## Problem

On Windows Nookat can only connect to a Docker daemon the user already runs, which in practice means Docker Desktop.
Without one, Nookat cannot run containers at all.
That also makes the Microsoft Store listing in DIST-005 much less useful.
Nookat should manage the same engine on every platform, so the plan is to use Colima on Windows as soon as Colima supports it, instead of a different runtime.

## Current state

- `COLIMA_MANAGED` in `src-tauri/src/services/engine/mod.rs` is false on Windows, and `src-tauri/src/services/engine/unmanaged_colima.rs` answers each Colima command with the `colima_unmanaged()` error.
- Engine Settings show the banner "Engine management is available on macOS only" (`src/components/settings/engine-settings/components/engine-configuration.tsx`).
- `DEFAULT_DOCKER_HOST` on Windows is `npipe:////./pipe/docker_engine`, and `connect_to_docker` also follows the Docker contexts, so Docker Desktop and engines that register a context are found.
- `src-tauri/src/services/shell/windows.rs` opens container terminals through `cmd /C start docker ...` and checks for the Docker CLI with `docker --version`.
- Windows releases ship an x64 NSIS installer and an x64 MSI from `.github/workflows/build-windows.yaml`, with no ARM64 build.
- Upstream:
  - In abiosoft/colima discussion #491 the maintainer wrote on 2025-08-07 that "Lima now has Windows support via WSL2 and Colima would eventually support Windows due to that", with no date.
  - Lima 2.3.0 (2026-11-06) publishes Windows AMD64 and ARM64 builds.
    Its `wsl2` VM type needs Windows 10 build 19041 or Windows 11, is marked experimental, and "currently doesn't support many of Lima's options".

## Scope

### Verify Colima on Windows first

- Once Colima publishes a Windows release, run it by hand on Windows 11 with WSL2: install, start, reach the Docker daemon from the host, publish a port, and mount a host folder into a container.
- Record what works and what does not, and turn the failures into tasks or into this task's scope.

### Manage the engine

- Add `src-tauri/src/services/engine/windows.rs` with the same functions as `macos.rs` and the Linux module from DIST-015, reusing the shared engine code that DIST-015 extracts.
- Pin the Windows builds of Colima, Lima and the Docker CLI with their SHA-256 digests, and install them into `%USERPROFILE%\.nookat\engine` with the existing installer.
- Connect to the engine's Docker endpoint, whether Colima exposes it as a named pipe, a socket or a Docker context.
- Show the same install, start, stop and resources UI as on macOS, and hide the settings that only apply to macOS.

### Check the host

- Detect whether WSL2 is installed and enabled (`wsl --status`) and whether virtualization is on.
- When it is missing, explain `wsl --install`, which needs an administrator and a restart, instead of failing on start.

### Done when

- On Windows 11 x64 without Docker Desktop, Nookat installs and starts the engine, and lists, runs and removes containers.
- With Docker Desktop running, Nookat keeps using it and offers the managed engine only from Engine Settings.
- Without WSL2, Engine Settings explain how to enable it.

## Notes

- Revisit this task when Colima publishes a release with Windows binaries; watch the abiosoft/colima releases and discussion #491.
- Until then, the Engine Settings banner on Windows could name the engines Nookat works with today, such as Docker Desktop, instead of only saying that management is macOS only.
  That does not depend on Colima and can ship on its own.
- Downloaded engine binaries and the installer need Windows code signing (DIST-001) to avoid SmartScreen warnings.
- An ARM64 Windows build of Nookat would be needed to run the engine natively on ARM64 machines.
- GitHub issue #56 is titled "[DIST-007]", but DIST-007 is now the beta channel task.
- Alternatives considered:
  - Rancher Desktop or Podman as the Windows engine: available today, but a different runtime from macOS and Linux, with its own installer and lifecycle.
  - Drive Lima's `wsl2` driver directly without Colima: Nookat would own the Docker provisioning inside the VM, as DIST-013 explains for macOS, and the driver is still experimental.
  - Create a WSL2 distribution with Docker Engine inside it (`wsl --import` of a small root file system): needs no third-party engine and works today, but it is a second engine implementation next to Colima.
    Evaluate it if Colima's Windows support keeps slipping.
