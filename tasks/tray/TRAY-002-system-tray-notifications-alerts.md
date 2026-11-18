# [TRAY-002] Send desktop notifications

- **Status:** Not started
- **Merged from:** TRAY-004, DEBUG-006
- **Related:** TRAY-005, MONITOR-001, MONITOR-003

## Problem

Nookat closes to the tray, so most of the time its window is hidden.
When a container crashes, a health check starts failing or the engine stops, nobody finds out until they open the window.
Users also want a warning when a container gets close to its CPU or memory limit.

## Current state

- Closing the window hides it to the tray by default (`closes_to_tray` and `hide_to_tray` in `src-tauri/src/lib.rs`, default set in `src-tauri/src/entities/config/v2.rs`), and the app can start at login through `tauri-plugin-autostart`.
- The engine state monitor (`src-tauri/src/services/engine_state_monitor.rs`) keeps watching Docker events and polling while the window is hidden, so the data for notifications is already there.
- All feedback is in-app `sonner` toasts, which nobody sees while the window is hidden.
- There is no notification plugin in `src-tauri/Cargo.toml` and no notification permission in `src-tauri/capabilities/default.json`.

## Scope

- Add `tauri-plugin-notification` with its permission in `src-tauri/capabilities/default.json`, and ask for permission on first use.
- Notify on events the monitor already sees:
  - A container exits unexpectedly (non-zero exit code, or killed for running out of memory).
  - A container becomes unhealthy, once MONITOR-003 shows health.
  - The engine stops or becomes unreachable.
  - An app update is ready to install.
- Notify when a container stays above a CPU or memory threshold, once MONITOR-001 provides stats.
- Clicking a notification opens the window on the relevant page.
- Add settings to turn notifications on or off per kind, plus the thresholds, which needs a new config version next to `src-tauri/src/entities/config/v2.rs`.
- Rate-limit repeated notifications, so a container stuck in a restart loop produces one notification, not one per restart.

## Notes

- Containers stopped on purpose by the user, from Nookat or the CLI, should not trigger a notification.
- Resource thresholds depend on the stats stream from MONITOR-001.
