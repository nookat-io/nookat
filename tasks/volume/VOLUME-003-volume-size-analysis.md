# [VOLUME-003] Show volume sizes

- **Status:** Partially done
- **Related:** VOLUME-001, VOLUME-004

## Problem

Users cannot see how much disk each volume uses, so they cannot tell which volumes to clean up when the disk or the Colima VM fills up.

## Current state

- `VolumesService::get_volume_sizes` in `src-tauri/src/services/volumes.rs`, exposed as the `get_volume_sizes` command, reads the sizes from `GET /system/df?verbose=true`.
- It only sees the `VolumeUsage` field of API 1.52 (Docker Engine 29) and newer, so older daemons give no sizes.
- `useVolumeSizes` in `src/components/volumes/volume-actions-service.ts` asks for the sizes only while the Volumes page is open: when it opens, when volumes are created or removed, and a minute after the previous answer.
- `src/components/volumes/volumes-table.tsx` shows a sortable Size column, with `-` for volumes the daemon does not measure.
- No totals are shown yet.

## Scope

- Show the total size of all volumes and of unused volumes, so users see what Prune Unused would free.
- Limit the `df` request to volumes with `type=volume` once bollard can encode `DataUsageOptions::_type`.

## Notes

- The disk usage endpoint walks every volume and can take seconds on large setups.
  Fetch it on demand or on a slow interval, not on every engine state update from `src-tauri/src/services/engine_state_monitor.rs`.
- Size trends, forecasting and optimization advice from the original ticket are left out; the size column is the useful core.
