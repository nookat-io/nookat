# [CONTAINER-008] Close the gaps in the container creation wizard

- **Status:** Partially done
- **Merged from:** CONTAINER-002, CONTAINER-003, CONTAINER-004, CONTAINER-006 (the parts about creating a container)
- **Related:** CONTAINER-007

## Problem

The creation wizard covers the common `docker run` options, but a few everyday cases still need the terminal or extra typing.
Users must type bind mount paths by hand, cannot add a tmpfs mount, and can attach a new container to only one network.
The wizard accepts CPU and memory limits the engine cannot satisfy and shows secret values in plain text on the review step.

## Current state

- The wizard shipped in #218 (PR #225): `src/components/containers/create/`, opened from `src/components/containers/container-header.tsx`, backed by the `create_container` command.
- Its seven steps are Image, General, Ports, Storage, Environment, Network and resources, and Review (`src/components/containers/create/wizard-state.ts`).
- Image: local images plus pulling a typed reference, with the lookalike source check from `src/lib/image-source/`.
- General: name, command, entrypoint, working directory, restart policy and auto remove.
- Ports: tcp, udp and sctp mappings with host IP, duplicate checks and a warning when a running container already publishes the host port (`src/components/containers/create/wizard-validation.ts`).
- Storage: volume and bind mounts with read-only, but `StorageMountKind` in `src-tauri/src/entities/containers/create.rs` has no tmpfs, and bind paths are typed into a text field (`src/components/containers/create/steps/storage-step.tsx`).
- Environment: key/value editors for env and labels, plus pasting a `.env` file (`src/components/containers/create/env-file.ts`), with duplicate key checks.
- Network and resources: one network (`network: Option<String>` in `create.rs`), CPU and memory limits checked only against Docker's absolute bounds in `src-tauri/src/services/container_creation/validation.rs`.
- Review: a summary and a copyable `docker run` command (`src/components/containers/create/docker-run-command.ts`) that print env values unmasked.
- The Images table row menu in `src/components/images/images-table.tsx` offers only Delete.

## Scope

- Add a native folder and file picker for bind mount sources with `tauri-plugin-dialog`, and its permission in `src-tauri/capabilities/default.json`.
- Add tmpfs mounts (target path, optional size) to the Storage step and to `StorageMountKind`.
- Export the environment as a `.env` file from the Environment step.
- Mask values whose keys look secret (`PASSWORD`, `TOKEN`, `SECRET`, `KEY`) on the Review step and in the `docker run` preview, with a reveal toggle.
- Warn when the CPU or memory limit is larger than what the engine reports (`NCPU` and `MemTotal` from `get_docker_info`).
- Allow more than one network at creation.
- Add a "Run" action to Images table rows that opens the wizard with that image preselected.

## Notes

- Engines older than API 1.44 accept only one network endpoint at create time; the backend would then connect the extra networks right after creation.
- Open question: should the copied `docker run` command keep real secret values so it works when pasted, while only the on-screen preview masks them?
