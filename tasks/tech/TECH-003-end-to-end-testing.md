# [TECH-003] Test whole user flows end to end

- **Status:** Not started
- **Related:** TECH-001, TECH-002

## Problem

No automated test runs the app the way a user does.
Regressions in flows that cross the frontend, the Tauri commands and the engine, such as creating a container with the wizard or installing Colima, are only caught by hand.

## Current state

Nothing on `main` runs the app end to end.
An earlier attempt, f8262ee on the unmerged `unit_tests` branch, added Playwright specs (`e2e/containers.spec.ts`, `e2e/navigation.spec.ts`, `e2e/visual.spec.ts`) and a `playwright.config.ts`.
It predates the Vitest suite and was never merged.

## Scope

- Choose the approach:
  - WebDriver through `tauri-driver` drives the real app with the real backend, but only on Linux and Windows.
  - Playwright against the Vite dev server with IPC mocked drives the real UI on every platform, but not the backend.
- Cover the main flows first: create a container with the wizard, start, stop and remove it, pull an image, create a network, and the engine error gate.
- Run the suite in CI on pull requests, on Linux with Docker available.
- Keep screenshots and traces of failed runs as CI artifacts.

## Notes

- `tauri-driver` does not support macOS, the main platform, so macOS-only flows such as the Colima install and VM start can't be covered this way.
- Reuse what still fits from f8262ee instead of starting over.
- Depends on TECH-002 for a CI job that already has a Docker engine.
