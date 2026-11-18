# [MONITOR-001] Stream container resource stats and draw graphs

- **Status:** Not started
- **Merged from:** DEBUG-004, NETWORK-006, NETWORK-008, PERF-006 (the stats part)
- **Related:** MONITOR-002, TRAY-002, DEBUG-001

## Problem

Users cannot see how much CPU, memory, network or disk I/O a container uses.
DEBUG-004 (performance profiling), NETWORK-006 (traffic visualization) and NETWORK-008 (network performance metrics) all need the same per-container numbers, so they are one task.
This is the foundation for MONITOR-002 and for resource alerts in TRAY-002.

## Current state

Nothing collects container stats.
No backend code calls the bollard stats API, and `package.json` has no chart library.
The only performance hints in the app are the Colima VM warnings in `src/components/settings/engine-settings/components/performance-warnings.tsx`.

## Scope

- Add a stats service that streams the bollard stats API for one container and turns each sample into CPU percent, memory used and limit, network rx and tx per interface, and block I/O read and write.
- Emit the samples on their own Tauri event per container, following the streaming pattern of `installation-progress` in `src-tauri/src/services/engine/macos.rs`, not inside the `engine_state_update` snapshot.
- Start a stream only while a view that shows it is open, and stop it when the view closes or the container stops.
- Add commands to start and stop a stats stream and register them in `src-tauri/src/lib.rs`.
- Add a stats view for a running container with live graphs for CPU, memory, network throughput and block I/O over a short rolling window.
- Show the current CPU and memory values in the containers table for running containers, if it stays cheap with many containers.
- Pick and add one chart library that works with both themes.

## Notes

- One stats stream per container is a long-lived HTTP connection to the engine; with many running containers the table values may need the one-shot `stream: false` mode on a slower interval.
- CPU percent has to be computed from the delta between two samples, and memory usage should subtract the page cache the same way `docker stats` does.
- Threshold alerts and notifications belong to TRAY-002.
- Engine-wide totals and top consumers belong to MONITOR-002.
- Packet-level traffic analysis between containers is out of scope; NETWORK-007 covers the connection map.
