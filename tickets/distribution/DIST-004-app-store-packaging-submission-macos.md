---
name: Feature request
about: Implement macOS App Store packaging and submission
title: '[DIST-004] App Store packaging and submission (macOS)'
labels: 'distribution, packaging, macos, app-store'
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
Nookat should be discoverable and installable via the Mac App Store. Without App Store distribution, users face manual installs, reduced trust, and lack automatic updates and license/compliance workflows.

**Describe the solution you'd like**
Implement end-to-end macOS App Store packaging and submission, including:

- **Store profile & certificates**: Configure App Store Connect, Bundle ID, provisioning profiles, and signing certificates
- **Entitlements & sandboxing**: Define and validate required entitlements and sandbox capabilities for Tauri app
- **Info.plist & metadata**: Generate localized metadata (name, description, keywords, screenshots, privacy details)
- **Build & sign**: Produce MAS-compatible build, sign with correct identities, and notarize if applicable
- **Submission automation**: Integrate with App Store Connect API or `xcrun altool`/`notarytool` equivalents for uploads
- **Review readiness**: Pre-submission validation, privacy manifests, and compliance checks
- **Release management**: Track TestFlight/internal testing, phased release, and version rollouts
- **Status visibility**: Surface build/submission status in CI logs and internal dashboard

**Describe alternatives you've considered**

- DMG/ZIP distribution outside the App Store: simpler, but lacks App Store reach and trust
- Third-party stores: limited user reach compared to the Mac App Store
- App Store-only distribution: reduces flexibility for enterprise/offline users; we should support both

**Additional context**

- Align with code signing already implemented for macOS
- Ensure entitlements align with Tauri capabilities and required APIs
- Decide on App Store Connect automation tooling (Fastlane vs direct API)
- Plan for ongoing metadata updates and localized screenshots in CI
