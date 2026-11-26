# [UX-013] Make the list pages dense enough for a working session

- **Status:** Not started
- **Related:** #341, PERF-003

## Problem

On a 1280x800 window the first container row starts 349 px from the top, and rows are 69 px tall, so the containers page shows five or six containers.
Someone who runs a Compose project next to a few one-off containers scrolls for everything.
The window cannot be made smaller than 1280x800, which is most of a 13-inch laptop screen for a tool that sits next to a terminal.

## Current state

- `src/components/layout/header.tsx` draws a 69 px app header that holds only the engine status label and the theme toggle.
- `src/components/layout/page-layout.tsx` stacks each page's header card above its filters in a sticky band with `p-6` and `space-y-6`.
- The header cards in `src/components/containers/container-header.tsx`, `src/components/images/image-header.tsx`, `src/components/volumes/volume-header.tsx` and `src/components/networks/network-header.tsx` repeat the same markup and the same "Manage your X - N found" line.
- Each of those `h1` elements carries a `bg-clip-text` class with no gradient behind it.
- `src/components/ui/table.tsx` gives header cells `h-12` and body cells `p-4`.
- `src-tauri/tauri.conf.json` sets `minWidth` 1280 and `minHeight` 800.
- Header actions differ between pages: Containers puts Prune before Create, Images puts Pull before Prune, and Create Container is a smaller button than Pull Image and Create Network.
- Image references, ports and IDs use the body font in the tables, while the wizard and the network subnets use a monospace face.

## Scope

- Keep the current sidebar and page layout, and tighten it.
- Replace the header card with one shared page toolbar: the title with the count, the filters, the search and the page actions, in the same order on every page.
- Move the engine status into the sidebar footer and the theme choice into Settings > General, then remove the app header.
- Make compact rows the default: about 36-40 px, with a sticky table header, a tint on selected rows and an "N selected" bar.
- Use a monospace face for image references, IDs, ports, paths and subnets in every table.
- Lower the minimum window size to about 960x600, and check every page and dialog at that size.

## Notes

- The design review in #341 chose to keep the current layout, so a native title bar toolbar is out of scope.
- PERF-003 renders large lists efficiently, and this task does not depend on it.
