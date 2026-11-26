# [UX-003] Fix accessibility gaps

- **Status:** Partially done
- **Related:** UX-002, UX-012, UX-014, #341

## Problem

Screen reader and keyboard users hit controls with no name and table features that only work with a mouse.

## Current state

What works:

- The primitives in `src/components/ui/` are built on Radix, which handles focus and keyboard use in dialogs, menus and selects.
- The container creation wizard ties labels and errors to its fields through `src/components/containers/create/field-aria.ts`.
- `src/components/ui/engine-error.tsx` announces an unreachable engine with `role="alert"`.

Gaps:

- The row checkboxes in `src/components/containers/container-row.tsx` and in the images, volumes and networks tables have no accessible name.
- The row action menu button in `src/components/containers/container-row-actions.tsx` shows only an icon and has no label.
- `src/components/ui/sortable-table-header.tsx` sorts on a click on the header cell only: the header is not focusable, is not a button, and sets no `aria-sort`.
- The collapsed sidebar shows icons with no text, no `aria-label` and no tooltip (`src/components/layout/sidebar.tsx`).
- The filter buttons on the list pages, such as `src/components/containers/container-controls.tsx`, show the active filter by colour only and set no `aria-pressed`.
- The focus ring is near black in the light theme and blue in the dark theme, and the sidebar links fall back to WebKit's default outline.
- Settings headings jump from `h1` to `h3`, because `CardTitle` in `src/components/ui/card.tsx` renders an `h3`.
- Nothing respects `prefers-reduced-motion`.
- `eslint.config.js` loads only the react-hooks and react-refresh plugins, so there is no accessibility lint, and no test checks accessibility.

## Scope

- Give every checkbox and icon-only button an accessible name.
- Make sortable headers buttons that work from the keyboard and expose the sort direction with `aria-sort`.
- Name the collapsed sidebar links and show their names as tooltips.
- Expose the active filter with `aria-pressed`.
- Use one focus ring style everywhere, built on the `--ring` token from UX-012.
- Respect `prefers-reduced-motion` for spinners and transitions.
- Check the colour contrast of status colours and badges in both themes once UX-012 has moved them onto tokens.
- Add `eslint-plugin-jsx-a11y` to the lint setup and fix what it reports.
- Add automated accessibility checks to the component tests, for example with axe.
- Walk the main flows with VoiceOver: browse lists, create a container, pull an image, change settings.

## Notes

- Open question: whether a dedicated high contrast theme is needed, as the original task suggested, or whether contrast fixes in the existing themes are enough.
