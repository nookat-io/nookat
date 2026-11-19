# [SECURITY-002] Show image layers and history

- **Status:** Not started
- **Related:** SECURITY-001, SECURITY-004, SECURITY-008

## Problem

Users cannot see what an image is made of: which instructions built it, which layers make it large, and how it is configured to run.
That makes it hard to judge whether an image is safe to run or why it is so big.

## Current state

Nothing exists.
The image commands in `src-tauri/src/lib.rs` list, pull, delete, prune and search images, and none of them inspects an image or reads its history.
The Images table (`src/components/images/images-table.tsx`) has no detail view.

## Scope

- Add backend commands for image inspect and image history through `ImagesService` in `src-tauri/src/services/images.rs`.
- Add an image detail view opened from the Images table.
- Show the image config: entrypoint, command, environment, exposed ports, user, labels, architecture and OS.
- List the layers with the instruction that created each one and its size, and highlight the largest layers.
- Point out what the metadata already reveals, such as no `USER` set or credentials passed through `ENV`.

## Notes

- A file-by-file view of each layer would need the layer tarballs and is an open question for a later step.
- SECURITY-001, SECURITY-004 and SECURITY-008 can reuse the inspect data this task adds.
