# [ORCHESTRATION-001] Manage Docker Compose projects

- **Status:** Partially done
- **Related:** ORCHESTRATION-003

## Problem

Many users run multi-container applications with Docker Compose.
They want to bring a project up and down, pull its images and read its logs from Nookat instead of running `docker compose` in the project folder.

## Current state

- The Containers page groups containers by their `com.docker.compose.project` label (`src/components/containers/container-utils.ts`).
- Each group row (`src/components/containers/container-group-row.tsx`) has group actions in `src/components/containers/container-group-actions.tsx`: Start when all are stopped, Stop, and Delete or Force Delete, built on the bulk container commands.
- Nothing reads compose files, so a project only appears once its containers exist, and a project that was brought down disappears.
- The Docker CLI that Nookat installs (`src-tauri/src/services/binary_install/`) does not include the Compose plugin.

## Scope

- A project view that lists each Compose project with its services, their containers and their status.
- Project actions: up, down, restart, pull, and logs of all services in one view (with MONITOR-004).
- Open a project from its compose file, so a project can be started before any of its containers exist.
- Remember opened projects so a project that is down still shows up.
- Show the working directory and the compose files of a running project, read from the `com.docker.compose.project.working_dir` and `com.docker.compose.project.config_files` labels.

## Notes

- Open question: run the Docker Compose CLI plugin, which would then need to be installed alongside the Docker CLI, or implement the needed subset of Compose on top of bollard.
  Using the plugin keeps behavior identical to `docker compose`; a reimplementation avoids a second binary but would drift.
- Editing compose files in the app was part of the original ticket; it should come after the project view works.
