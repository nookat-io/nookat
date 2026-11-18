# [LPAGE-001] Add app store badges to the landing page

- **Status:** Blocked
- **Blocked by:** no store listings exist yet (DIST-003, DIST-004, DIST-005, DIST-006)

## Problem

Users who prefer an app store or a package manager can't find Nookat in one from the landing page.
Badges and links for the Mac App Store, the Microsoft Store, the Snap Store and Homebrew would give them an official, self-updating install path.

## Current state

The landing page lives in the separate `nookat-io/nookat-io.github.io` repository.
Its download links point only at GitHub releases, through `LATEST_RELEASE_URL` in that repository's `src/lib/github.ts`.
Nookat has no store listing or Homebrew cask yet.

## Scope

- Add a download section with the official badge of each store where Nookat is listed, linking to its listing.
- Show the `brew install --cask nookat` command once the cask exists.
- Keep the GitHub release download as the default for each platform.
- Follow each store's badge and branding guidelines, and keep the section responsive.

## Notes

- Add each badge as its listing goes live, rather than waiting for all of them.
- This change happens in the landing page repository, not in this one.
