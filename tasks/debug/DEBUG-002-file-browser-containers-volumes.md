# [DEBUG-002] Browse files in containers and volumes

- **Status:** Not started
- **Merged from:** VOLUME-005, UX-001
- **Related:** VOLUME-001

## Problem

Users want to look at, download and replace files inside a container or a volume without a terminal and `docker cp`.
VOLUME-005 asked to inspect what a volume holds, and UX-001 asked to drag files between the desktop and a container.
Both need the same file browser, so they are one task.

## Current state

Nothing exists.
A stub `container_files` command that only returned "not implemented" was removed in 141dc90.
The `inspect_volume` command is registered in `src-tauri/src/lib.rs` and implemented in `src-tauri/src/services/volumes.rs`, but nothing in `src/` calls it.
The frontend has no drop handlers.

## Scope

- Add a backend listing of a directory in a container, with name, type, size, mode and modification time.
- Download a file or folder to the host through the archive API (`GET /containers/{id}/archive`), unpacking the tar stream on the Rust side.
- Upload files to a chosen folder through the archive API (`PUT /containers/{id}/archive`), packing them as a tar stream.
- Add a file browser view opened from the container row actions, with breadcrumb navigation, a text preview for small files, download, and upload.
- Accept files dragged from the desktop onto the browser and upload them to the open folder, using Tauri's drag-and-drop events.
- Show progress for large transfers and a clear error for permission failures.
- Browse volumes with the same view by reaching their data through a container that mounts them.

## Notes

- Open question: how to list a directory.
  An exec of `ls` fails on images without a shell, while reading the archive API's stat header and tar listing works on any image but is heavier for large folders.
- Open question: how to reach a volume that no running container mounts.
  One option is a short-lived helper container that mounts the volume read-only; it needs a small image to be present or pulled.
- Archive uploads into a running container work on every engine, but writing into a stopped container's file system may need extra care with ownership and modes.
- The app's capabilities in `src-tauri/capabilities/default.json` need updating if a native save dialog is added for downloads.
