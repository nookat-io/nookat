# [DIST-005] Package and submit to the Microsoft Store

- **Status:** Not started
- **Related:** DIST-001, DIST-016, LPAGE-001

## Problem

Users should be able to discover, install and update Nookat from the Microsoft Store.
Without a Store presence, installation is manual, trust is lower, and updates are harder to manage.

## Current state

`.github/workflows/build-windows.yaml` produces only the default `tauri-apps/tauri-action` output, an NSIS installer and an MSI.
There is no MSIX package, app manifest or Partner Center setup.

## Scope

- **Packaging format:** build an MSIX (preferred) with the right capabilities and declarations.
- **App manifest:** define the identity, visual assets, capabilities and required declarations.
- **Store onboarding:** configure the Partner Center app, the reserved name and the product IDs.
- **Submission automation:** create drafts, upload packages and submit through the Partner Center APIs or tooling.
- **Compliance checks:** age ratings, privacy policy, runtime dependencies and capability reviews.
- **Release management:** flighting, staged rollouts and a version and channel strategy.
- **Status visibility:** report submission and build status in the CI logs.

## Notes

- Needs a Partner Center account.
- Needs Windows code signing (DIST-001) for Store acceptance.
- Running containers on Windows is still open: the managed Windows engine (DIST-016) is blocked until Colima supports Windows.
  The Store listing is less useful until Nookat can provide or find an engine on Windows.
- Decide on the CI tooling for Partner Center submission and asset uploads.
- Plan for localized Store listings, screenshots and ongoing metadata updates.
- Alternatives considered:
  - Sideloaded MSIX or installer only is easier at first but lacks the Store's discoverability and trust.
  - winget only is useful, but the Store gives broader reach and automatic updates.
  - Store-only distribution would shut out enterprise and offline users, so both channels should exist.
