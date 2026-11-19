# [DIST-007] Add a beta release channel

- **Status:** Not started
- **Related:** DIST-005, DIST-006

## Problem

Pre-release builds need a controlled way to reach testers without affecting stable users.
Today there is no managed beta channel.

## Current state

The updater (`tauri-plugin-updater`) has a single endpoint in `src-tauri/tauri.conf.json`, `https://github.com/nookat-io/nookat/releases/latest/download/latest.json`.
There is no channel setting in the app config.
`.github/workflows/release.yaml` publishes only versions whose tag matches the app version.

## Scope

- **Channels:** a beta track across every distribution mechanism (the updater, Snap channels, Store flighting).
- **Opt-in:** a setting to join or leave the beta, with clear warnings and release notes.
  It needs a new config version next to `src-tauri/src/entities/config/v2.rs`.
- **Updater:** a separate beta manifest, chosen at runtime from the channel setting.
- **Versioning:** semantic version pre-release suffixes or channel metadata to tell beta from stable.
- **Telemetry:** tag beta users and builds in crash reports and usage analytics.
- **Rollback:** a safe way back to stable when a beta misbehaves.
- **Release process:** CI jobs that build, sign and publish beta artifacts, with a gated promotion to stable.

## Notes

- GitHub issue #56 is titled "[DIST-007]" but covers a managed Colima engine for Windows, which is DIST-016.
- Define the criteria for promoting a beta to stable, and how to halt or bisect a regression.
- Feature flags may be needed to scope beta-only functionality.
- Alternatives considered:
  - Nightly-only builds are faster but too unstable for most testers.
  - Stable-only releases have no feedback loop for early validation.
  - Private ad-hoc builds have limited reach and a poor update story.
