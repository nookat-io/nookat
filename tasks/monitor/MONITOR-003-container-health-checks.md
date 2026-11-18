# [MONITOR-003] Show container health and explain failures

- **Status:** Not started
- **Merged from:** DEBUG-005, DEBUG-008, DEBUG-009
- **Related:** MONITOR-004, UX-004

## Problem

Users cannot tell from Nookat whether a container's health check passes, and when a container exits or restarts they get no hint why.
DEBUG-005 (health diagnostics), DEBUG-008 (automated problem detection) and DEBUG-009 (recovery recommendations) all describe this, so they are one task.

## Current state

Nothing in `src/` or `src-tauri/src/` reads container health.
The backend sends the Docker `status` string, which includes "(healthy)" or "(unhealthy)", as `status` in `src-tauri/src/entities/containers/container.rs`.
`src/components/containers/container-status-badge.tsx` renders only the `state`, so the health part is never shown.
The creation wizard in `src/components/containers/create/` has no health check option.

## Scope

- Add the health status (starting, healthy, unhealthy, none) to the container entity, read from the container's `State.Health` or parsed from the status string.
- Show the health next to the state badge in the containers table.
- Show the last health check results (exit code, output, time) in a container detail view.
- Add an optional health check step to the creation wizard: command, interval, timeout, retries and start period.
- Explain common failures in plain words with a suggested action:
  - Exit code 137 or `OOMKilled`: the container ran out of memory; suggest a higher memory limit.
  - Exit code 127: the command was not found; suggest checking the image's entrypoint and command.
  - Exit code 126: the command is not executable.
  - A port that is already in use when starting: name the port and the container that holds it.
  - A restart loop: show the restart count and point to the logs from MONITOR-004.

## Notes

- Reading `State.Health` needs a container inspect per container; the list API only carries the status string, so parsing it keeps the engine state update cheap.
- Health changes do not change the container count or state, so the engine state monitor has to treat them as a change for the badge to update.
- Explanations should come from fixed rules over exit codes and Docker errors, not from a generic "problem detection" engine.
- Desktop notifications for an unhealthy container belong to TRAY-002.
