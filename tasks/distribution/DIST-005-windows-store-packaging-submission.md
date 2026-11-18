---
name: Feature request
about: Implement Microsoft Store packaging and submission for Windows
title: '[DIST-005] Microsoft Store packaging and submission (Windows)'
labels: 'distribution, packaging, windows, microsoft-store'
assignees: ''
---

**Is your feature request related to a problem? Please describe.**
We need first-class Microsoft Store distribution so users can discover, install, and update Nookat from the Store. Without Store presence, installation is manual, trust is lower, and updates are harder to manage.

**Describe the solution you'd like**
Deliver end-to-end Microsoft Store packaging and submission:

- **Packaging format**: Build MSIX (preferred) with correct capabilities and declarations
- **Appx manifest**: Define identity, visual assets, capabilities, and required declarations
- **Store onboarding**: Configure Partner Center app, reserved name, and product IDs
- **Submission automation**: Use Partner Center APIs or tooling to create drafts, upload packages, and submit
- **Compliance checks**: Age ratings, privacy policy, CRT dependencies, and capability reviews
- **Release management**: Support flighting, staged rollouts, and version/channel strategy
- **Status visibility**: Expose submission/build status via CI logs and internal dashboard

**Describe alternatives you've considered**

- Sideloaded MSIX/installer only: easier initially, but lacks Store discoverability and trust
- Winget distribution only: useful, but Store provides broader reach and auto-updates
- Store-only distribution: limits enterprise/offline users; we should support both

**Additional context**

- Ensure Windows code signing is in place for Store acceptance
- Decide on CI tooling for Partner Center submission and asset uploads
- Plan for localized Store listings, screenshots, and ongoing metadata updates
