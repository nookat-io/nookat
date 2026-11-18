# [VOLUME-004] Show which containers use a volume

- **Status:** Not started
- **Related:** VOLUME-003, CONTAINER-007

## Problem

Users cannot see which containers mount a volume, or where inside each container it is mounted.
Without that they cannot tell whether a volume is safe to remove, or why a container sees certain data.

## Current state

- The Volumes table (`src/components/volumes/volumes-table.tsx`) shows each volume's host mountpoint path.
- The In Use and Unused filters (`src/components/volumes/volume-filter.ts`) rely on `ref_count`, which `count_containers_mounting` in `src-tauri/src/services/volumes.rs` computes by scanning container mounts.
  Only the count is kept, not which containers matched.
- `mounts` is typed on containers in `src/components/containers/container-types.ts`, but no component shows a container's mounts.

## Scope

- Keep the names of the containers that mount each volume, not only the count, when building the volume list.
- In the Volumes table, show the containers that use a volume, with the path each one mounts it at and whether it is read-only.
- Link each container to its row on the Containers page.
- Show a container's mounts (volumes, bind mounts and tmpfs) in the container details from CONTAINER-007.
- When removing a volume that is in use, list the containers that block the removal.

## Notes

- The container list that `get_volumes` already fetches has every mount, so this needs no extra Docker calls.
- A graph view of volumes and containers was part of the original ticket; a list is enough to start.
