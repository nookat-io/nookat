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
- The Pull Image dialog shows the pull's progress (#241).
  `pull_image` takes an optional Tauri channel, `on_progress`, and sends the state of every layer through it at most every 100 ms (`src-tauri/src/services/image_pull.rs`).
  The dialog turns that into a percentage, bytes downloaded and layers ready (`src/components/images/common/pull-summary.ts`).
- The pull step of the container creation wizard calls `pull_image` without a channel and still shows only a spinner.
- Bulk container actions, bulk volume removal and prunes return only when they finish, with no progress.
- No backend command accepts a cancel request.

## Scope

- Show the image pull progress in the pull step of the container creation wizard, reusing the pull dialog's channel and summary.
- Report bulk action progress as items done out of the total, with per-item failures.
- Show a running state and the result for prunes.
- Let users cancel a pull, a bulk action and a running install, and clean up what was started.
- Report progress through a Tauri channel passed to the command, as `pull_image` does, so it reaches only the caller that started the operation.

## Notes

- This task took over the progress parts of UX-006.
- Per-item results of bulk actions come from the rework in PERF-008.
- Open question: whether dropping the pull stream on cancel also stops the pull in the engine, or whether the engine keeps downloading.
