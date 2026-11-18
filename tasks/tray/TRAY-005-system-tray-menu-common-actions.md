# [TRAY-005] Show engine and container status in the tray menu

- **Status:** Partially done
- **Merged from:** TRAY-003
- **Related:** TRAY-002, ENGINE-008

## Problem

Nookat closes to the tray by default, but the tray menu can only open the window or quit.
Checking whether the engine is running, or starting and stopping a container, means opening the full window.

## Current state

`build_tray` in `src-tauri/src/lib.rs` builds a static menu with two items, Open and Quit.
The menu never changes after startup and shows no status.
The commands the menu would need already exist and are registered in `src-tauri/src/lib.rs`:

- Engine: `start_colima_vm_command`, `stop_colima_vm_command`.
- Containers: `start_container`, `stop_container`, `restart_container`.

## Scope

- Show the engine status at the top of the menu, with Start Engine or Stop Engine depending on that status.
- List running containers, each with a submenu to stop, restart or open it in the window, plus a submenu with stopped containers to start.
- Add Settings, which opens the window on the Settings page, next to Open and Quit.
- Rebuild the menu whenever the engine state monitor publishes a new snapshot (`src-tauri/src/services/engine_state_monitor.rs`), instead of building it once.
- Reflect the engine status in the tray icon or its tooltip.
- Report a failed action through a notification once TRAY-002 exists, since the window may be hidden.

## Notes

- Group containers by Compose project the way the Containers page does, and cap the list, so the menu stays usable with many containers.
- The tray should call the same services as the existing handlers, not duplicate their logic.
- Engine start and stop exist only for the Colima engine on macOS; on other platforms the engine entries show status only.
