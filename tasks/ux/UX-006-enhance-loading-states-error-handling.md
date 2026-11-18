# [UX-006] Add an error boundary and loading skeletons

- **Status:** Partially done
- **Related:** #22, PERF-004

## Problem

A rendering error in any component leaves the window blank with no way to recover except restarting the app.
While lists load, pages show a centered spinner, so the layout jumps when the data arrives.

## Current state

- `src/components/ui/loading-spinner.tsx` and `src/components/ui/error-display.tsx` (with a retry button) are used by all four tables, from the work in #22.
- Actions report results and failures through sonner toasts (`src/components/ui/sonner.tsx`).
- `src/components/ui/engine-error.tsx` handles an unreachable engine.
- No React error boundary exists anywhere in `src/`.
- No skeleton component exists in `src/components/ui/`.

## Scope

- Add an error boundary around each page and one around the app shell, showing what failed with a way to reload the page and a way to report the error through Sentry.
- Replace the table spinners with skeleton rows that keep the table layout while data loads.

## Notes

- Progress for image pulls, bulk actions and prunes moved to PERF-004.
- Wording of backend errors is covered by UX-004 for the engine and by I18N-002 for translated messages.
