# [UX-015] Polish the dialogs, menus and list details

- **Status:** Not started
- **Related:** #341, UX-011, UX-012, MONITOR-004, VOLUME-003

## Problem

Small inconsistencies add up to an app that feels unfinished to someone who tries it for five minutes.

## Current state

- The Docker Hub results in the Pull dialog spill out of the dialog down to the bottom edge of the window (`src/components/images/common/docker-hub-search.tsx`).
- The image delete dialog has no gap under its title, while the prune dialog is padded.
- The Pull dialog reads "Pull Image from Registry" over "Pull an image from a registry".
- A dangling image shows an empty name next to its `<none>` tag (`src/components/images/images-table.tsx`).
- The network filter says "Others" while the badge on the same networks says "Custom" (`src/components/networks/network-controls.tsx`, `src/components/networks/networks-table.tsx`).
- Docker Official Images get a crown icon in `docker-hub-search.tsx`, and the Logs menu item gets an external link icon in `src/components/containers/container-row-actions.tsx`.
- The logs dialog caps the log at 384 px (`max-h-96` in `src/components/containers/container-logs-form.tsx`), shows Close as the primary button, and drops the Refresh label while loading.
- The empty containers page keeps Prune Stopped and the select-all checkbox enabled.
- The Volumes size column shows "-" on every row, so loading, unknown and not available look the same.
- The Volumes mount point column shows paths inside the VM, which mean nothing on a Mac host.
- Scrollbars are hidden everywhere (`src/index.css`), so the logs, the wizard's image list and long tables give no hint that they scroll.
- In the dark theme the title bar strip uses the background colour next to the card-coloured sidebar, which leaves a visible seam (`src/App.tsx`).

## Scope

- Keep the Docker Hub results inside the dialog and the window.
- Give every dialog the same spacing, and write titles and descriptions that do not repeat each other.
- Name dangling images, for example by their short ID, and use one word for non-system networks in the filter and the badge.
- Use icons that match their meaning for official images and for Logs.
- Let the log fill the dialog height, make Close a secondary button, and keep the Refresh label while loading.
- Disable bulk actions and select-all on an empty list.
- Show a loading state, a value or "n/a" in the volume size column.
- Hide the mount point column or replace it with something the user can act on.
- Restore thin overlay scrollbars.
- Paint the title bar strip in the colour of the surface under it.

## Notes

- Follow mode and live tail stay in MONITOR-004, and a full container details view in CONTAINER-007.
- VOLUME-003 adds real volume sizes, and this task only stops the column from looking broken until then.
- Confirmation dialogs are rebuilt in UX-011, and the dialog scrim comes from UX-012.
