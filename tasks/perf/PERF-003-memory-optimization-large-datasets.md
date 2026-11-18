# [PERF-003] Render large lists efficiently

- **Status:** Not started
- **Merged from:** PERF-007
- **Related:** PERF-008

## Problem

With thousands of containers or images, every table mounts a DOM row for every item.
Each engine state update then re-renders those tables, so scrolling and filtering get slow and memory use grows with the list.

## Current state

`src/components/containers/containers-table.tsx`, `src/components/images/images-table.tsx`, `src/components/volumes/volumes-table.tsx` and `src/components/networks/networks-table.tsx` map every item to a table row.
No virtualization library is in `package.json`.
The backend pushes the whole `EngineState` on every `engine_state_update`, and `src/lib/engine-provider.tsx` keeps it as the single source of truth for all pages.

## Scope

- Virtualize table rows so only the visible rows mount, for example with `@tanstack/react-virtual`.
- Keep sorting, filters, search, selection and the Compose group rows (`src/components/containers/container-group-row.tsx`) working with virtualized rows.
- Avoid re-rendering rows whose item did not change when a new snapshot arrives, with stable keys, memoized rows and derived lists computed once per snapshot.
- Measure before and after with generated data of 1000+ containers and 1000+ images.

## Notes

- PERF-007 asked for server-side pagination.
  Docker list APIs have no paging and the app receives full snapshots, so virtualization replaces it.
- The backend side of scale, such as event debouncing and smaller snapshots, is PERF-008.
