# [CONTAINER-007] Change the settings of an existing container

- **Status:** Not started
- **Merged from:** CONTAINER-002, CONTAINER-004, CONTAINER-006 (the parts about containers that already exist)
- **Related:** CONTAINER-008

## Problem

The creation wizard sets environment variables, networks and resource limits only when a container is created.
To change any of them later, users go back to the terminal and run `docker update`, `docker network connect` or recreate the container by hand.
Users also cannot see which environment variables a running container has.

## Current state

- Nothing in the app changes a container after it is created.
- The row menu in `src/components/containers/container-row-actions.tsx` offers lifecycle actions (start, stop, restart, pause, delete, logs, terminal) only.
- There is no container inspect command, so the app never reads a container's env, mounts or network endpoints in detail.
- The wizard state and the `docker run` preview already exist in `src/components/containers/create/` and can be reused for a prefilled flow.

## Scope

- Add a container details view that shows the current environment variables, networks, mounts, ports and resource limits from a container inspect.
- Change CPU and memory limits and the restart policy in place with the Docker update API (`docker update`).
- Connect a container to a network and disconnect it from one, with optional network aliases.
- Add a "Recreate with changes" action for settings Docker cannot change in place (env, ports, mounts, image).
  It opens the creation wizard prefilled from the inspect result, then replaces the old container once the new one is created.
- Follow the backend layering: a service in `src-tauri/src/services/`, thin handlers, and each command registered in `src-tauri/src/lib.rs`.

## Notes

- Recreating removes the old container, so anything written outside volumes is lost; the confirm dialog must say so.
- Open question: should "Recreate with changes" keep the old container stopped as a fallback until the new one starts, or remove it right away?
- Connecting a running container to a network takes effect immediately, while `docker update` limits may be rejected by some runtimes; surface Docker's error as is.
