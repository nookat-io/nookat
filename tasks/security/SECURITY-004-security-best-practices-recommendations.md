# [SECURITY-004] Flag risky container settings

- **Status:** Not started
- **Merged from:** SECURITY-005
- **Related:** SECURITY-001, SECURITY-002, SECURITY-006

## Problem

Containers often run with settings that widen the attack surface, such as root, privileged mode or a mounted Docker socket.
Users get no warning about these, neither while creating a container nor for containers already running.

## Current state

Nothing checks container settings.
The creation wizard (`src/components/containers/create/`) builds a `CreateContainerSpec` (`src-tauri/src/entities/containers/create.rs`) that cannot set privileged mode or capabilities.
It does allow bind mounts of any host path, host networking, no resource limits and the `latest` tag.
Containers created outside Nookat can have any setting, and there is no container inspect command in `src-tauri/src/lib.rs` to read them.

## Scope

- Check a container's config for: running as root, privileged mode, added capabilities, host network or PID namespace, a mounted Docker socket, writable bind mounts of sensitive host paths, no memory or CPU limit, an image pinned to `latest` or to no tag, and ports published on all interfaces.
- Show the findings on the review step of the creation wizard (`src/components/containers/create/steps/review-step.tsx`) before the container is created.
- Show the findings for existing containers, for example as a warning marker on the row with the list in a detail view, which is the configuration half of SECURITY-005.
- Explain each finding in a sentence with the risk and how to fix it.

## Notes

- Existing containers need a container inspect command first.
- Image-level checks such as a missing `USER` come from the inspect data in SECURITY-002.
- Open question: whether users can dismiss a finding for a given container.
