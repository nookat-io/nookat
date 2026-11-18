# [DIST-006] Package and submit to the Snap Store

- **Status:** Not started
- **Related:** DIST-002, DIST-007, LPAGE-001

## Problem

Nookat should be discoverable and installable from the Snap Store, which gives it strong discovery on Ubuntu.

## Current state

There is no `snapcraft.yaml` and no Snap Store step.
Linux releases ship an AppImage, a `.deb` and an `.rpm` from `.github/workflows/build-linux.yaml`.

## Scope

- **snapcraft.yaml:** define the base, the confinement (strict or classic), plugs and slots, entry points and hooks.
- **Builds:** produce stable builds in CI for `amd64` and `arm64`.
- **Store automation:** authenticate CI with the Snap Store, push revisions and release them to channels.
- **Channels:** support stable, candidate, beta and edge tracks that match the release strategy (DIST-007).
- **Permissions:** justify and document the interfaces and confinement the app needs.
- **Status visibility:** report build and release status in the CI logs.

## Notes

- Choose the confinement from the capabilities Nookat needs.
  It talks to a Docker socket and may run `docker` and `colima`, which strict confinement restricts.
- GitHub issue #55 is titled "[DIST-006]" but covers a different scope, a bundled Colima distribution for Linux, not Snapcraft.
- Coordinate with Linux signing (DIST-002) and the overall packaging strategy.
- Plan ownership, listing copy and screenshots for the Snap Store page.
- Alternatives considered:
  - AppImage or Flatpak are viable, but the Snap Store gives stronger discovery on Ubuntu.
  - deb and rpm only serve specific distributions, while Snap reaches Ubuntu users more broadly.
  - Plain tarballs are simplest but have a poor update and trust story.
