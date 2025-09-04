---
name: Feature request
about: Add beta channel support for early access and testing
title: '[DIST-007] Beta channel support'
labels: 'distribution, updates, beta'
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
We need a controlled way to deliver pre-release builds for testing and feedback without impacting stable users. Today there is no managed beta channel.

**Describe the solution you'd like**
Introduce a beta channel with:

- **Channeling**: Distinct beta track across distribution mechanisms (auto-updater, Snap channels, Store flighting)
- **Opt-in UX**: In-app toggle to join/leave beta, with clear warnings and release notes
- **Versioning**: Semantic version suffixes or channel metadata to distinguish beta vs stable
- **Telemetry**: Tag beta users and builds for crash/usage analysis
- **Rollback**: Safe downgrade path to stable if issues arise
- **Release process**: CI jobs to build, sign, and publish beta artifacts; gated promotions to stable

**Describe alternatives you've considered**

- Nightly-only builds: faster but too unstable for most testers
- Public stable-only: lacks feedback loop for early validation
- Private ad-hoc builds: limited reach and poor update story

**Additional context**

- Coordinate with auto-update system and platform-specific stores
- Define criteria to promote beta to stable and how to halt/bisect regressions
- Ensure feature flags can scope beta-only functionality when needed
