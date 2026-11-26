# [UX-014] Rework the Settings layout into clear groups

- **Status:** Not started
- **Related:** #341, UX-004, UX-012, I18N-001

## Problem

Settings is the screen #341 calls out.
Section titles are 24 px against a 30 px page title, cards sit inside cards, and nothing tells the eye where to start.
Some elements carry no information: the VM capacity bars are always full and grey, with a banner that apologises for them, and a full-width select offers one language.

## Current state

- `src/pages/SettingsPage.tsx` always opens on the General tab and uses the same header card as the list pages.
- `CardTitle` in `src/components/ui/card.tsx` renders an `h3` at `text-2xl`, so the headings jump from `h1` to `h3`.
- `src/components/settings/general-settings.tsx` offers only English in its language select, and the Usage Statistics description repeats the label of its first switch.
- Check for updates puts a Check Now button next to its switch in one row.
- `src/components/settings/engine-settings/components/capacity-bar.tsx` draws every resource at 100%, and an info banner in `engine-status-section.tsx` explains why.
- When no engine is installed, the Engine tab starts with an empty "No engine information available" card.
- Bordered boxes sit inside the Engine cards, for example `info-banner.tsx` and the VM resource groups.
- Engine Actions shows two different check marks next to each other: a text check in `engine-actions-card.tsx` and a lucide icon in `docker-context-notice.tsx`.
- The native number spinners in `resource-input.tsx` render light grey in the dark theme.

## Scope

- Lay out settings as grouped rows, with the label and help text on the left and the control on the right, and use one card level only.
- Add type scale tokens for the page title (about 20 px), section titles (about 15 px), body text and captions, use them across the app, and fix the heading levels.
- Open Settings on the tab a link asks for, so the engine screen from UX-004 can link straight to the Engine tab.
- Show the engine status and Start or Stop in one header row of the Engine tab.
- Show VM resources as values instead of capacity bars, and remove the banner.
- Hide the language select until I18N-001 adds a second language.
- Give the update check a single control per row.
- Style number inputs for both themes.

## Notes

- It builds on the tokens from UX-012.
- What a user without an engine sees belongs to UX-004.
