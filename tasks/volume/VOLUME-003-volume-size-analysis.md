# [VOLUME-003] Show volume sizes

- **Status:** Not started
- **Related:** VOLUME-001, VOLUME-004

## Problem

Users cannot see how much disk each volume uses, so they cannot tell which volumes to clean up when the disk or the Colima VM fills up.

## Current state

- `VolumesService::get_volumes` in `src-tauri/src/services/volumes.rs` sets `size: 0` for every volume and fills only `ref_count`.
- The frontend type in `src/components/volumes/volume-types.ts` carries `size`, but `src/components/volumes/volumes-table.tsx` has no size column.

## Scope

- Read volume sizes from Docker's disk usage endpoint (`/system/df`, bollard's `df`).
- Show a Size column in the Volumes table, formatted with the existing byte formatting, and allow sorting by it.
- Show the total size of all volumes and of unused volumes, so users see what Prune Unused would free.
- Show a placeholder instead of `0 B` when the size is not known, for example for drivers that do not report it.

## Notes

- The disk usage endpoint walks every volume and can take seconds on large setups.
  Fetch it on demand or on a slow interval, not on every engine state update from `src-tauri/src/services/engine_state_monitor.rs`.
- Size trends, forecasting and optimization advice from the original ticket are left out; the size column is the useful core.
