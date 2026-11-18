# [PERF-008] Keep the app fast with 1000+ containers

- **Status:** Not started
- **Related:** PERF-003, PERF-004

## Problem

With 1000+ containers, bulk actions are slow, one failure stops the rest, and every Docker event makes the backend reload every list.

## Current state

- The bulk container commands in `src-tauri/src/handlers/containers.rs` (lines 99-222) handle one container at a time and return at the first failure, so later containers are left untouched and unreported.
- `VolumesService::bulk_remove_volumes` in `src-tauri/src/services/volumes.rs` stops at the first failure in the same way.
- The container bulk logic sits in `handlers/` instead of `services/`, unlike the rest of the backend.
- `src-tauri/src/services/engine_state_monitor.rs` reacts to every Docker event by reading all four lists (containers, images, volumes, networks) again with no debounce, so a bulk action on N containers causes several full reloads per container.
- `has_state_changed` in the same file compares container IDs and states, but only the lengths of the image, volume and network lists.
- Every publish sends the whole `EngineState` on `engine_state_update`.

## Scope

- Coalesce bursts of Docker events into one refresh, and refresh only the lists the events touch.
- Detect changes by comparing entities instead of list lengths, and publish only what changed instead of the whole snapshot.
- Move bulk operations into services, run them with bounded concurrency, and return a result per item so one failure does not stop the rest.
- Measure with 1000+ containers on a throwaway Colima profile.

## Notes

- Comparing list lengths misses changes that keep the counts equal, such as tagging an existing image or renaming a container.
  That is a correctness bug on its own and may be fixed separately before the rest of this task.
- Frontend rendering at scale is PERF-003, and progress for bulk actions is PERF-004.
