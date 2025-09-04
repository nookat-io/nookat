---
name: Feature request
about: Create a Homebrew cask for easy installation and updates
title: '[DIST-003] Create a Homebrew cask'
labels: 'distribution, packaging, homebrew'
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
Users need a simple, trusted way to install and update Nookat on macOS (and optionally Linux via Linuxbrew). Manual downloads increase friction and make updates harder, which reduces adoption and creates support burden.

**Describe the solution you'd like**
Create and maintain a Homebrew Cask that enables `brew install --cask nookat` with:

- **Cask definition**: A `nookat.rb` cask with app name, version, sha256, URL, `zap` stanzas, and caveats if needed
  - Ensure tokenization: cask token `nookat` (lowercase, hyphen/space rules per docs)
  - Include `desc` and `homepage`
  - Use per-arch checksums via `on_arm` / `on_intel` (or `arch` blocks) if artifacts differ
  - Add `auto_updates true` if the app self-updates; otherwise omit
  - Prefer `livecheck` over deprecated mechanisms for updates
  - After notarization, staple the ticketed build: `xcrun stapler staple "Nookat.app"`
  - Add `depends_on macos: ">= :big_sur"` (adjust as needed)
- **Hosting**: Decide whether to submit to `homebrew-cask` or host in a custom tap (e.g., `nookat-dev/homebrew-tap`)
- **CI automation**: Pipeline that builds artifacts, computes checksums, updates the cask, and opens PRs automatically
- **Updates**: Support for app auto-updates or `brew upgrade --cask nookat`; consider `livecheck` for version discovery
- **Architectures**: Provide universal or separate artifacts for `arm64` and `x86_64`
- **Code signing/notarization**: Ensure the downloaded app is signed/notarized for macOS to prevent Gatekeeper warnings
- **Uninstall/zap**: Proper uninstall and `zap` cleanup of caches, prefs, and logs
- **Docs**: Add install/upgrade/uninstall instructions to README and website

**Describe alternatives you've considered**

- Direct downloads with an in-app updater (Already implemented)
- Third-party package managers (MacPorts, Nix): useful but smaller audience than Homebrew (Maybe will be implemented in the future, out of the scope of this ticket)

**Additional context**

- Coordinate with release versioning so CI can update the cask automatically
- If using a custom tap, secure access tokens and branch protections
- If submitting to `homebrew-cask`, follow their audit rules and PR checklist
- Consider future support for Linuxbrew; if not supported, document macOS-only
