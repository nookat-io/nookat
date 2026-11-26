# [UX-004] Explain why the engine is unreachable

- **Status:** Partially done
- **Related:** TRAY-002, MONITOR-003, UX-014, #341

## Problem

When Nookat cannot reach the engine, it only says "Engine status is unknown".
Users cannot tell whether Docker is missing, the VM is stopped, the socket is not accessible or the CLI points at another context, so they do not know what to do next.
For a new Mac user without Docker this is the first screen Nookat shows: a red "Error" with a Retry button that cannot fix a missing engine.

## Current state

- The header shows a colored status dot and label (`src/components/layout/header.tsx`).
- `src/lib/engine-provider.tsx` reads the engine status on mount and every 5 seconds until the first pushed engine state arrives, and receives the pushed engine state, and the backend emits `engine-connected` when a connection is made (`src-tauri/src/state.rs`).
- `src/components/ui/engine-error.tsx` blocks every page except Settings with a retry button while the status is `Unknown`.
- Settings shows engine details and warns when the Docker CLI context does not use Colima (`src/components/settings/engine-settings/components/docker-context-notice.tsx`).
- Settings opens on the General tab, and when no engine is installed the Engine tab starts with an empty status card, with the Colima install below the fold inside a collapsible card.
- `create_engine` in `src-tauri/src/services/engine/mod.rs` returns `EngineStatus::Unknown` for every failure, and the reason is only logged at debug level.

## Scope

- Keep the reason the connection failed: no Docker CLI, no socket or endpoint found, connection refused, permission denied, VM stopped, or a Docker context that points elsewhere.
- Show that reason in the engine error screen and in the header tooltip, with one next step for each, such as starting the VM or switching the context in Settings.
- Show when the engine was last reachable and when the status last changed.
- Replace the error screen with an engine screen for the expected states: not installed (install Colima from that screen), installed but stopped (start it, with progress), and unreachable (the reason and Retry).
- Do not call an expected first-run state an error.
- Link from that screen to the Engine tab, which UX-014 lets Settings open directly.

## Notes

- Desktop notifications for engine status changes belong to TRAY-002.
- Container-level health and diagnostics are MONITOR-003.
- Open question: whether a short history of status changes is worth keeping beyond the last change.
