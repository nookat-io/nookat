# [MONITOR-002] Add a resource overview dashboard

- **Status:** Not started
- **Related:** MONITOR-001, VOLUME-003

## Problem

Users want one place that shows how loaded the engine is and which containers use the most resources.
Today they have to inspect containers one by one, and there is nothing to inspect yet.

## Current state

There is no dashboard page; the routes in `src/App.tsx` are Containers, Images, Networks, Volumes and Settings.
`src/components/settings/engine-settings/engine-status-section.tsx` shows fixed Docker info such as total CPU cores and memory, not live usage.
`src/components/settings/engine-settings/components/vm-resources-card.tsx` shows the Colima VM's configured CPUs, memory and disk.
No backend code reads disk usage from the Docker `system df` API.

## Scope

- Add an overview page with engine-wide CPU and memory use against the engine's capacity.
- List the top containers by CPU and by memory, linking to their stats view from MONITOR-001.
- Show disk usage split into images, containers, volumes and build cache from the `system df` API.
- Show counts of running, paused and stopped containers from the existing engine state.
- Add the page to the sidebar and wrap it in `EngineErrorGate` like the other entity pages.

## Notes

- Depends on MONITOR-001 for live per-container numbers.
- The `system df` call can be slow on engines with many images; fetch it on demand or on a slow interval, not on every engine state update.
- The same `system df` data can fill volume sizes for VOLUME-003.
- Open question: whether to show the Colima VM's own CPU and memory use, which the Docker API does not report.
