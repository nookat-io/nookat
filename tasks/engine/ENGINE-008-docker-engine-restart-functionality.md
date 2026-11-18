# [ENGINE-008] Restart the engine

- **Status:** Partially done
- **Related:** ENGINE-004, ENGINE-005

## Problem

When the engine misbehaves, or after a config change that applies only on start, users want a single Restart action.
Today they have to stop the engine, wait, and start it again.

## Current state

- Settings has Start Engine and Stop Engine buttons with a confirm dialog in `src/components/settings/engine-settings/components/engine-actions-card.tsx`.
- They call the `start_colima_vm_command` and `stop_colima_vm_command` commands, backed by `start_colima_vm` and `stop_colima_vm` in `src-tauri/src/services/engine/macos.rs`.
- Both stream their progress as `vm-startup-progress`, `vm-startup-complete`, `vm-startup-error` and `vm-stop-progress` events.
- There is no restart action.
- Only macOS manages the engine; `src-tauri/src/services/engine/unmanaged_colima.rs` returns an error for these commands on other platforms.

## Scope

- A Restart Engine action next to Start and Stop, with a confirm dialog that says running containers will stop.
- A backend restart that stops the Colima VM and starts it again with the profile's current settings, reusing the existing progress events so the UI shows one continuous progress view.
- Offer the restart wherever a setting needs a VM restart to apply (ENGINE-004, ENGINE-005, VM resource changes).
- Disable the action while a start or stop is already running.

## Notes

- `colima restart` exists, but stopping and starting through the existing service code keeps the progress reporting and the start arguments from `src-tauri/src/services/colima/start_args.rs` in one place.
- Open question: should Restart also exist for unmanaged engines, for example by restarting the Docker service on Linux, or stay macOS only?
