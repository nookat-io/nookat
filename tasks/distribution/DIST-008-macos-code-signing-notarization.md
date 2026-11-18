# [DIST-008] Sign and notarize the macOS build

- **Status:** Blocked
- **Blocked by:** an Apple Developer Program membership, which has expired (see dfe9427)
- **Related:** DIST-001, DIST-002, DIST-003, DIST-004

## Problem

Gatekeeper refuses to open the app on first launch with an "unidentified developer" warning.
Users have to allow the app explicitly, as described in the "macOS: first launch" section of the README.

## Current state

The macOS build is ad-hoc signed (`APPLE_SIGNING_IDENTITY: '-'` in `.github/workflows/build-macos.yaml`) and not notarized, since dfe9427.
Ad-hoc signing is the minimum macOS requires to launch a universal binary on Apple Silicon.
The workflow's "Verify ad-hoc signature" step checks that signature before the release upload.

## Scope

Once an Apple Developer Program membership is available, sign the release with a Developer ID certificate and notarize it:

- Add the `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `KEYCHAIN_PASSWORD`, `APPLE_ID`, `APPLE_ID_PASSWORD` and `APPLE_TEAM_ID` secrets.
- Add a keychain import step to `build-macos.yaml` before the build.
- Drop the ad-hoc `APPLE_SIGNING_IDENTITY: '-'` from both tauri-action steps, so tauri-action signs with the imported identity and notarizes.
- Replace the "Verify ad-hoc signature" step with a check of the Developer ID signature and the notarization ticket (`spctl --assess` and `xcrun stapler validate`).
- Remove the "macOS: first launch" workaround from the README.

## Notes

- Alternatives considered:
  - Keep ad-hoc signing: the app works, but every new user hits the Gatekeeper warning.
  - Distribute through Homebrew only (DIST-003): helps Homebrew users, but direct downloads still need signing, and the official cask expects a notarized app anyway.
- Windows signing is DIST-001 and Linux signing is DIST-002.
- Mac App Store distribution is DIST-004 and needs the same membership.
- GitHub issue #74 was titled "[DIST-008]" but covered the Colima binary install, which is unrelated and shipped in #218.
