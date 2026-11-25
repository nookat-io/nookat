# [VOLUME-004] Show which containers use a volume

- **Status:** Not started
- **Related:** VOLUME-003, CONTAINER-007

## Problem

Users cannot see which containers mount a volume, or where inside each container it is mounted.
Without that they cannot tell whether a volume is safe to remove, or why a container sees certain data.

## Current state

- The Volumes table (`src/components/volumes/volumes-table.tsx`) shows each volume's host mountpoint path.
- The In Use and Unused filters (`src/components/volumes/volume-filter.ts`) rely on `in_use`, which `VolumesService::get_volumes` in `src-tauri/src/services/volumes.rs` reads from the daemon's `dangling=false` volume list.
  The daemon says only whether a volume is referenced, not by which containers.
- `mounts` is typed on containers in `src/components/containers/container-types.ts`, but no component shows a container's mounts.

## Scope

- Find the names of the containers that mount each volume, not only whether one does.
- In the Volumes table, show the containers that use a volume, with the path each one mounts it at and whether it is read-only.
- Link each container to its row on the Containers page.
- Show a container's mounts (volumes, bind mounts and tmpfs) in the container details from CONTAINER-007.
- When removing a volume that is in use, list the containers that block the removal.

## Notes

- `get_volumes` fetches no containers, but every container in the engine state snapshot carries its `mounts`, so the frontend can match them to volumes without extra Docker calls.
- A graph view of volumes and containers was part of the original ticket; a list is enough to start.
