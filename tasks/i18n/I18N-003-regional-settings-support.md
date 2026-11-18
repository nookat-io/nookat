# [I18N-003] Format dates, numbers and sizes for the user's locale

- **Status:** Not started
- **Related:** I18N-001

## Problem

Dates, relative times, numbers and sizes are always formatted the English way, whatever language or region the user has.

## Current state

- Relative times use `formatDistanceToNow` from date-fns without a locale in `src/components/containers/container-row.tsx`, `src/components/networks/networks-table.tsx` and `src/components/images/images-table.tsx`.
- The first two append " ago" by hand instead of using the `addSuffix` option.
- `src/components/settings/general-settings.tsx` uses `toLocaleDateString()`, which follows the system locale instead of the app language.
- `formatBytes` in `src/utils/format.ts` hardcodes the unit names and the decimal point.

## Scope

- Format dates, relative times, numbers and sizes through one helper that takes the active locale.
- Use the locale of the language chosen in I18N-001, and fall back to the system locale.
- Replace the hand-built " ago" strings with locale-aware relative time.

## Notes

- Depends on I18N-001.
- Open question: whether users need a region setting separate from the language, as the original task suggested.
