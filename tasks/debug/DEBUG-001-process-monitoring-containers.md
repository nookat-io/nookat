# [DEBUG-001] Show the processes running in a container

- **Status:** Not started
- **Related:** MONITOR-001, MONITOR-003

## Problem

When a container misbehaves, users want to see what runs inside it without opening a shell.
Today the only way is to open a terminal into the container and run `ps` by hand, which fails for images that ship without `ps` or without a shell.

## Current state

Nothing lists container processes.
No backend code calls the Docker top API (`GET /containers/{id}/top`).
The closest feature is the `open_terminal` command in `src-tauri/src/handlers/containers.rs`.
It finds a shell with `ContainersService::interactive_shell` in `src-tauri/src/services/containers.rs` and opens an external terminal through `src-tauri/src/services/shell/`.

## Scope

- Add a `ContainersService` function and a `container_processes` command that call the Docker top API through bollard and return typed rows (PID, user, CPU, memory, start time, command).
- Register the command in `generate_handler![]` in `src-tauri/src/lib.rs`.
- Add a Processes view for a running container, opened from the container row actions, with a manual refresh and an optional auto refresh while the view is open.
- Sort and filter the rows by command and user.
- Show a clear message for stopped or paused containers instead of an error.

## Notes

- The top API runs `ps` on the host side of the engine, so it works for images without `ps` or a shell.
- The `ps_args` parameter accepts custom `ps` flags; decide whether to expose it or keep one fixed column set.
- Per-process CPU and memory history needs the stats stream from MONITOR-001; this task only shows the current snapshot.
- Killing or signalling a single process would need an exec into the container; that is out of scope unless users ask for it.
