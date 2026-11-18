# [MONITOR-004] Follow, tail and combine container logs

- **Status:** Partially done
- **Merged from:** DEBUG-007, PERF-006 (the logs part)
- **Related:** MONITOR-003, ORCHESTRATION-001

## Problem

Debugging a container usually means watching its logs live, jumping to the latest lines, and finding errors quickly.
The current logs dialog reads the whole log once, so long logs are slow and new lines need a manual refresh.
DEBUG-007 (error log analysis) and the logs part of PERF-006 (load logs lazily) are folded in here.

## Current state

- The `container_logs` command in `src-tauri/src/handlers/containers.rs` calls `ContainersService::get_container_logs` in `src-tauri/src/services/containers.rs`.
- It reads the whole log stream to the end into one list of lines, mixing stdout and stderr, without timestamps.
- `src/components/containers/container-logs-form.tsx` shows the lines in a dialog with a text search, copy, download and a manual refresh.
- Logs are fetched only when the dialog opens.

## Scope

- Fetch only the last N lines by default through the `tail` option, with a way to load more or set a `since` time.
- Add a follow mode that streams new lines on a Tauri event while the dialog is open and stops when it closes.
- Keep timestamps from the `timestamps` option and show them as a toggleable column.
- Keep stdout and stderr apart, show stderr lines differently, and allow filtering by stream.
- Highlight lines that look like errors or warnings and allow filtering to them.
- Add a combined view for a Compose project that interleaves its containers' logs by time, labelled by container.
- Keep the scroll position pinned to the bottom while following, unless the user scrolls up.

## Notes

- The follow stream is a long-lived connection; the backend must cancel it when the dialog closes or the container is removed.
- Error highlighting is a simple pattern match on common level words, not log parsing or analysis.
- Large outputs need a virtualized list; PERF-003 covers list rendering.
- Compose projects are grouped by the `com.docker.compose.project` label today, which ORCHESTRATION-001 builds on.
