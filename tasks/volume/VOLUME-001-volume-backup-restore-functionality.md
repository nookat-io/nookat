# [VOLUME-001] Back up, restore and migrate volumes

- **Status:** Not started
- **Merged from:** VOLUME-002
- **Related:** VOLUME-003, DEBUG-002

## Problem

Volumes hold the data that matters, such as databases, uploads and caches, and Docker offers no built-in backup.
Users who want a copy of a volume, or want to move one to another machine or engine, have to run a throwaway container with `tar` by hand.

## Current state

- Nothing backs up, restores or moves volumes.
- The Volumes page (`src/components/volumes/volumes-table.tsx`) lists, filters, removes and prunes volumes.
- `inspect_volume` is registered in `src-tauri/src/lib.rs` but nothing in the frontend calls it.

## Scope

- Back up a volume to a `.tar.gz` file the user picks on the host, with streamed progress.
- Restore a backup into a new volume or, after a confirmation, into an existing empty volume.
- Migrate a volume to another engine or Docker context by backing it up from one and restoring it into the other.
- Warn before backing up a volume that a running container writes to, since the copy may be inconsistent, and offer to stop those containers first.
- Store the source volume's name, labels and driver in the archive so a restore recreates them.

## Notes

- The usual approach is a short-lived helper container that mounts the volume and streams a tar archive through the Docker API, so it works the same with Colima and other engines.
  The helper image must be small and pinned, and pulling it needs network access on first use.
- Scheduled backups and keeping several versions of a backup were part of the original tickets.
  Open question: are they wanted, given that Nookat has no background service of its own when the app is closed?
- Migrating between storage drivers other than `local` is out of scope until someone needs it.
