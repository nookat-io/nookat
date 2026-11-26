# [UX-011] Confirm every action that destroys data or a running container

- **Status:** Not started
- **Related:** #341, UX-002, UX-015, VOLUME-004

## Problem

Nookat asks for confirmation in the wrong places.
Deleting a volume or force-deleting a running container from a row menu happens on the first click.
Deleting an image, which can be pulled again, and stopping the engine VM, which starts again, both ask first.
The Force Delete item sits directly under Logs with no separator, so one misclick removes a running container together with its writable layer.
Docker refuses to remove a volume that a container still uses, but an unused volume with data, such as the files a removed MinIO container left behind, disappears in one click.

## Current state

- `src/components/containers/container-row-actions.tsx` calls `ContainerActionService.deleteContainer` straight from the Delete and Force Delete menu items.
- `src/components/volumes/volumes-table.tsx` calls `VolumeActionService.removeVolume` straight from the row menu, and `src/components/volumes/volume-actions.tsx` deletes the selected volumes without asking.
- `src/components/containers/container-actions.tsx` deletes selected stopped containers without asking, and asks only when the selection includes a running container (`src/components/containers/dialogs/ContainerForceDeleteConfirmDialog.tsx`).
- When a selection mixes running and stopped containers, the bulk toolbar hides Start and Stop and offers only Force Delete.
- Five confirm dialogs exist side by side: `src/components/common/ConfirmDialog.tsx`, `src/components/images/dialogs/DeleteConfirmDialog.tsx`, `src/components/images/dialogs/PruneConfirmDialog.tsx`, `src/components/containers/dialogs/ContainerPruneConfirmDialog.tsx` and `src/components/containers/dialogs/ContainerForceDeleteConfirmDialog.tsx`.
- The container prune dialog does not list the containers it removes.
- Settings > Engine shows Stop Engine as a full-width red button with its own warning dialog (`src/components/settings/engine-settings/components/engine-actions-card.tsx`).
- The row menus have no separators, and the destructive item is not set apart from the others.

## Scope

- Apply one rule everywhere: an action that destroys data or a running workload asks first, and an action that can be undone does not.
- Confirm before deleting a volume, a running container or several containers, and before every prune.
- Replace the five dialogs with one destructive confirm component that names every affected object.
- For volumes, show the size and the containers that mount them in that dialog.
- Ask to type the volume name before deleting a named volume.
- Run reversible actions such as Stop Engine without a dialog, report them with a toast, and show Stop Engine as a regular outline button.
- Put destructive menu items last, behind a separator, in every row menu.
- Keep Start, Stop and Restart available for a mixed selection, act on the containers they apply to, and report the ones that were skipped.

## Notes

- The one-click row deletes are a data-loss bug, so ship their confirmation as a standalone fix before the rest of this task.
- The containers that mount a volume can be read from the mounts already in the engine state; VOLUME-004 shows the same list on the volumes page.
- UX-002 adds a Delete shortcut for the selection, which must go through the same confirmation.
