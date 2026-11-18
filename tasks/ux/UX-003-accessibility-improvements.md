# [UX-003] Fix accessibility gaps

- **Status:** Partially done
- **Related:** UX-002

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
- Nothing respects `prefers-reduced-motion`.
- `eslint.config.js` loads only the react-hooks and react-refresh plugins, so there is no accessibility lint, and no test checks accessibility.

## Scope

- Give every checkbox and icon-only button an accessible name.
- Make sortable headers buttons that work from the keyboard and expose the sort direction with `aria-sort`.
- Respect `prefers-reduced-motion` for spinners and transitions.
- Check color contrast of status colors and badges in light and dark themes.
- Add `eslint-plugin-jsx-a11y` to the lint setup and fix what it reports.
- Add automated accessibility checks to the component tests, for example with axe.
- Walk the main flows with VoiceOver: browse lists, create a container, pull an image, change settings.

## Notes

- Open question: whether a dedicated high contrast theme is needed, as the original task suggested, or whether contrast fixes in the existing themes are enough.
