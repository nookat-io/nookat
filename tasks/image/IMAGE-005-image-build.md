# [IMAGE-005] Build images from a Dockerfile

- **Status:** Not started
- **Merged from:** CONTAINER-001
- **Related:** #131, CONTAINER-008

## Problem

Users have to leave Nookat and run `docker build` in a terminal to create an image from a Dockerfile.
That splits the workflow between Nookat for managing containers and the command line for building images.
Beginners may find the command line intimidating and prefer a visual way to build images.

## Current state

- Nothing builds images yet.
- `src/components/images/build/` holds only a `.gitkeep`, and there is no build command in `src-tauri/src/lib.rs`.
- The pull flow in `src/components/images/pull/` and `ImagesService::pull_image` in `src-tauri/src/services/images.rs` are the closest existing patterns.

## Scope

- **Access:** a "Build from Dockerfile" button, or an item in the Pull button's drop-down, on the Images page that opens a build dialog.
- **Dockerfile selection:**
  - A file picker for an existing Dockerfile.
  - Optionally, drag and drop of a Dockerfile and its build context.
- **Build configuration:**
  - Image name and tag.
  - Build context directory.
  - Build arguments (`ARG`) as key/value pairs.
  - Build options such as `--no-cache`, `--pull` and `--squash`.
- **Real-time progress:**
  - Live build log output, streamed from the backend as events in the same way as `installation-progress`.
  - A step-by-step progress indicator.
  - A layer-by-layer view of the build.
  - Highlighted errors with suggestions.
- Build cancellation that stops the build and cleans up.
- The finished image shows up in the Images table, and the dialog offers to run it with the creation wizard.
- Support multi-stage builds.

## Notes

- The build must use the Docker API through bollard and stream its output, not shell out to `docker build`.
- Technical considerations: packing and sending large build contexts (respect `.dockerignore`), file system access from the webview, streaming build output, cancellation and cleanup.
- A Dockerfile-based "create a container" wizard (the old CONTAINER-001) is this build flow followed by the existing creation wizard.
- Alternatives considered and rejected:
  - An embedded terminal: less friendly than a dedicated interface.
  - Launching Docker Desktop or another external build tool: breaks the single app experience.
  - A plain text input for `docker build` arguments: no visual feedback.
  - Template-based building only: too limiting for custom Dockerfiles.
- Inline Dockerfile editing was mentioned as a possible later step.
- Priority from the original request: high, since it completes the image workflow.
- Estimated complexity: high, for the streaming backend, file system access and real-time frontend state.
