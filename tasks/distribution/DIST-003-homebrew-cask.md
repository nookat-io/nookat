# [DIST-003] Publish a Homebrew cask

- **Status:** Not started
- **Related:** DIST-008, LPAGE-001

## Problem

Users need a simple, trusted way to install and update Nookat on macOS, and optionally on Linux through Homebrew on Linux.
Manual downloads add friction and make updates harder, which reduces adoption and creates support burden.

## Current state

There is no cask, tap or CI step for Homebrew.
Releases ship a universal `.dmg` and `Nookat_universal.app.tar.gz` from `.github/workflows/build-macos.yaml`, and the app updates itself through `tauri-plugin-updater`.
The app requires macOS 11 Big Sur (`bundle.macOS.minimumSystemVersion` in `src-tauri/tauri.conf.json`).

## Scope

Create and maintain a cask so that `brew install --cask nookat` works:

- **Cask definition:** a `nookat.rb` cask with the app name, version, sha256, URL and `zap` stanzas, plus caveats if needed.
  - Use the cask token `nookat`, following the token naming rules.
  - Include `desc` and `homepage`.
  - Use per-architecture checksums through `on_arm` and `on_intel` (or `arch` blocks) if the artifacts differ.
  - Add `auto_updates true`, since the app updates itself.
  - Use `livecheck` for version discovery instead of deprecated mechanisms.
  - Add `depends_on macos: ">= :big_sur"`, which matches the minimum system version.
  - Once the build is notarized (DIST-008), staple the ticket with `xcrun stapler staple "Nookat.app"`.
- **Hosting:** decide between submitting to `homebrew/cask` and hosting a custom tap such as `nookat-io/homebrew-tap`.
- **CI automation:** a release step that computes the checksums, updates the cask and opens the pull request automatically.
- **Updates:** support both the in-app updater and `brew upgrade --cask nookat`.
- **Architectures:** point at the universal build, or at separate `arm64` and `x86_64` artifacts.
- **Uninstall:** clean `uninstall` and `zap` stanzas that remove caches, preferences, logs and `~/.nookat`.
- **Docs:** install, upgrade and uninstall instructions in the README and on the website.

## Notes

- The official `homebrew/cask` expects apps that pass Gatekeeper, and the macOS build is only ad-hoc signed since dfe9427.
  An official cask therefore effectively waits on DIST-008.
  A custom tap works today, with a caveat that points to the "macOS: first launch" section of the README.
- Coordinate with release versioning so CI can update the cask automatically.
- With a custom tap, protect the access token and the tap's branches.
- When submitting to `homebrew/cask`, follow its audit rules and pull request checklist.
- Consider Homebrew on Linux later, or document the cask as macOS-only.
- Alternatives considered:
  - Direct downloads with the in-app updater, which already exist.
  - Other package managers such as MacPorts or Nix reach a smaller audience and are out of scope here.
