# [ENGINE-004] Edit the Docker daemon config of the Colima VM

- **Status:** Not started
- **Related:** ENGINE-005, ENGINE-008

## Problem

Users who need daemon settings such as registry mirrors, insecure registries, log drivers or default address pools have to edit Docker's daemon config by hand.
With the Colima engine that Nookat manages, the daemon runs inside the VM, so a host `daemon.json` has no effect.
Colima takes the daemon config from the `docker:` section of the profile's `colima.yaml` and applies it when the VM starts.

## Current state

- Nothing edits the daemon config.
- The app reads `colima.yaml` read-only: `profile_config_path` and `parse_profile_config` in `src-tauri/src/services/colima/profile.rs` load CPU, memory, disk, VM type, Rosetta and inotify settings only.
- Changes to the VM are passed as `colima start` flags (`src-tauri/src/services/colima/start_args.rs`, `ColimaVmSettingsChanges` in `src-tauri/src/entities/engine/colima.rs`), never written to `colima.yaml`.
- Engine management is macOS only; other platforms use `src-tauri/src/services/engine/unmanaged_colima.rs`, which returns an error for every Colima command.

## Scope

- Read the `docker:` section of the active profile's `colima.yaml` and show it in Settings.
- Offer form fields for the common keys (registry mirrors, insecure registries, default log driver and its options, default address pools) plus a raw JSON editor for the rest.
- Validate the result as JSON before saving.
- Write the change back to `colima.yaml` without dropping the user's other keys or comments, and keep a backup of the previous file.
- Tell the user that the change applies on the next VM start, and offer to restart the engine (ENGINE-008).

## Notes

- Open question: is writing `colima.yaml` safe while the VM runs, or should the editor require the VM to be stopped?
- Preserving comments may need a different YAML library than `serde_yaml_ng`, which drops them.
- For engines Nookat does not manage (Docker Engine on Linux, other Docker contexts), the editor should say it cannot change their config rather than edit a file that has no effect.
