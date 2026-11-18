# [PERF-004] Show progress for long operations and let users cancel them

- **Status:** Partially done
- **Related:** UX-006, PERF-008

## Problem

Image pulls, bulk actions and prunes can take minutes.
During that time users see only a spinner, cannot tell whether anything is happening, and cannot stop the operation.

## Current state

- Commands are async Tauri commands, so they do not block the UI thread.
  The original premise of this task, that heavy operations block the UI, no longer holds.
- The Colima install, VM start and VM stop stream progress through the `installation-progress`, `vm-startup-progress` and `vm-stop-progress` events from `src-tauri/src/services/engine/macos.rs`.
- `ImagesService::pull_image` in `src-tauri/src/services/images.rs` reads the pull stream but only logs each item at debug level (lines 129-133).
  The pull dialog (`src/components/images/pull/pull-image-modal.tsx`) shows "Pulling..." until the command returns.
- Bulk container actions, bulk volume removal and prunes return only when they finish, with no progress.
- No backend command accepts a cancel request.

## Scope

- Stream image pull progress per layer (downloading, extracting, bytes done) to the pull dialog and to the pull step of the container creation wizard.
- Report bulk action progress as items done out of the total, with per-item failures.
- Show a running state and the result for prunes.
- Let users cancel a pull, a bulk action and a running install, and clean up what was started.
- Use one event naming scheme for all of them, following the `-progress`, `-complete` and `-error` events of the install flow.

## Notes

- This task took over the progress parts of UX-006.
- Per-item results of bulk actions come from the rework in PERF-008.
- Open question: whether dropping the pull stream on cancel also stops the pull in the engine, or whether the engine keeps downloading.
