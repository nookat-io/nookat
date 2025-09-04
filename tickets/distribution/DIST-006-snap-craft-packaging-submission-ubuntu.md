---
name: Feature request
about: Implement Snapcraft packaging and submission for Ubuntu
title: '[DIST-006] Snapcraft packaging and submission (Ubuntu)'
labels: 'distribution, packaging, linux, snapcraft'
assignees: ''
---

**Is your feature request related to a problem? Please describe.**

We want Nookat to be discoverable and installable from the Snap Store

**Describe the solution you'd like**

Provide a complete Snapcraft pipeline and store submission:

- **snapcraft.yaml**: Define base, confinement (strict/classic), plugs/slots, entry points, and hooks
- **Builds**: Produce stable builds in CI for `amd64`/`arm64` as needed
- **Store automation**: Authenticate CI with Snap Store, push revisions, and release to channels
- **Channels**: Support stable/beta/candidate/edge tracks aligning with our release strategy
- **Permissions**: Justify and document required interfaces and confinement
- **Status visibility**: Show build/release status in CI and internal dashboard

**Describe alternatives you've considered**

- AppImage or Flatpak: viable alternatives, but Snap Store provides strong discovery on Ubuntu
- Deb/RPM only: good for specific distros, but Snap is broader for Ubuntu users
- Manual tarballs: simplest, but poor update and trust story

**Additional context**

- Coordinate with Linux code signing and packaging strategy
- Decide on confinement mode based on required capabilities
- Plan ownership, listing copy, and screenshots for the Snap Store page
