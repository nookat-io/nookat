# [UX-012] Give the app one colour system that passes contrast in both themes

- **Status:** Not started
- **Related:** #341, UX-003, UX-014

## Problem

Status colour is the main way people scan Nookat, and today it changes meaning between pages.
Running is green in the containers table and blue on the Settings tiles, stopped is grey in the table and red on the tiles, and images are green.
A Compose group reads "running" as soon as one member runs, so a project with a crashed cache and a paused worker looks healthy.
The same blue marks the active page, the active filter, the primary button, the Custom network badge, checkbox borders and port links, so it no longer points at anything.
Several pairs fail WCAG AA:

- white on the primary blue is 3.64:1 in both themes;
- white on the destructive red is 3.6:1 in the light theme;
- the paused value on its Settings tile is 2.8:1;
- the inactive Settings tab is 4.35:1;
- an off switch is 1.26:1 against its card in the light theme and 1.22:1 in the dark theme.

The light theme uses neutral greys (hue 0) and the dark theme blue slate (hue 217-222), so the two themes look like two products.

## Current state

- `src/index.css` holds the shadcn neutral tokens with only `--primary` changed to `210 100% 50%`, five unused `--chart-*` tokens, and no tokens for status, success, warning or info.
- Status and feedback colours are Tailwind palette classes with hand-written `dark:` variants in more than 20 files, for example `src/components/containers/container-group-row.tsx`, `src/components/images/images-table.tsx`, `src/components/networks/networks-table.tsx` and `src/components/settings/engine-settings/components/stat-card.tsx`.
- The same amber callout is copied into several files.
- Badge text casing differs: `running` and `exited` are lower case, `In Use` and `Custom` are title case.
- The dialog overlay is `bg-background/80` (`src/components/ui/dialog.tsx`), a white wash in the light theme and almost no dimming in the dark theme.
- `--ring` is near black in the light theme and blue in the dark theme.
- `src/components/ui/switch.tsx` draws the off track in `--input`, which nearly matches the card.

## Scope

- Add status tokens (running, paused, stopped, error, transitioning) and feedback tokens (success, warning, danger, info), each with foreground, background and border values for both themes, and expose them to Tailwind.
- Add one StatusBadge (a dot and a sentence-case label) and one Callout component.
- Replace every hard-coded palette class with those components or with the tokens.
- Show a Compose group's state from its members, for example "3/5 running" with a mixed-state marker.
- Colour the Settings stat tiles with the same status tokens as the tables, or drop the tile colours.
- Never fill a badge with the primary colour.
- Darken the primary to about `hsl(210 100% 40%)` and the destructive red to about `hsl(0 72% 45%)`, so white text on them passes 4.5:1.
- Make the off switch track pass 3:1 against its card.
- Use one neutral hue family in both themes.
- Set `--ring` to the primary in both themes, and use it for links and sidebar items too.
- Add a scrim token for dialog overlays, black at about 40% in the light theme and 60% in the dark theme.
- Add a test that checks the contrast of the token pairs, so a later change cannot break it.

## Notes

- This is the colour part of #341.
- The Models page from MODEL-001 lands before this task, so move it onto the tokens here as well.
- UX-003 measures contrast with axe and VoiceOver, and this task fixes the tokens it measures.
