# [DIST-004] Package and submit to the Mac App Store

- **Status:** Blocked
- **Blocked by:** an Apple Developer Program membership, which has expired (see dfe9427)
- **Related:** DIST-008, LPAGE-001

## Problem

Nookat should be discoverable and installable through the Mac App Store.
Without it, users face manual installs and reduced trust, and miss the Store's automatic updates and licensing.

## Current state

There is no Mac App Store configuration, provisioning profile, entitlements file or submission step.
Releases are ad-hoc signed and not notarized since dfe9427 (see DIST-008).

## Scope

- **Store profile and certificates:** configure App Store Connect, the bundle ID, provisioning profiles and signing certificates.
- **Entitlements and sandboxing:** define and validate the entitlements and sandbox capabilities the Tauri app needs.
- **Info.plist and metadata:** generate localized metadata (name, description, keywords, screenshots, privacy details).
- **Build and sign:** produce a Mac App Store build and sign it with the right identities.
- **Submission automation:** upload through the App Store Connect API or `xcrun altool` / `notarytool` equivalents.
- **Review readiness:** pre-submission validation, privacy manifests and compliance checks.
- **Release management:** TestFlight or internal testing, phased release and version rollouts.
- **Status visibility:** report build and submission status in the CI logs.

## Notes

- Open question: is a Mac App Store build viable at all?
  Answer this before paying for any setup work.
  The App Store requires the sandbox, which likely conflicts with how Nookat works:
  - It runs `docker`, `brew` and `colima` through the shell allowlist in `src-tauri/capabilities/default.json`.
  - It installs Colima, Lima and the Docker CLI into `~/.nookat/engine` (`src-tauri/src/services/binary_install/`).
- Signing and notarization for direct downloads come first in DIST-008, and share the same membership.
- Decide on the App Store Connect automation tooling (Fastlane or the API directly).
- Plan for ongoing metadata updates and localized screenshots in CI.
- Alternatives considered:
  - DMG or ZIP outside the App Store is simpler but lacks the Store's reach and trust.
  - Third-party stores reach far fewer users.
  - Store-only distribution would shut out enterprise and offline users, so both channels should exist.
