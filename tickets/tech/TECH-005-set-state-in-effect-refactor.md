# [TECH-005] Remove synchronous setState calls from effects

## Overview

`eslint-plugin-react-hooks` v7 enables the `react-hooks/set-state-in-effect` rule, which flags eight
existing call sites where an effect synchronously calls a state setter.
These sites are currently suppressed with targeted `eslint-disable-next-line` comments referencing this
ticket, so that new code is still held to the rule while the existing debt stays greppable.

## Description

Calling `setState` synchronously in an effect body causes a second render pass immediately after the
first, which React documents as a performance and correctness smell.
Most of the flagged sites are one of two patterns: state that is derived from props or context and
kept in sync through an effect, or a data-fetch helper that flips a loading flag before its first
`await`.

Both patterns have well-understood replacements, but the fixes change render and fetch timing in the
provider components that the whole app hangs off, so they need their own review and their own
end-to-end pass rather than riding along with a dependency bump.

## Affected call sites

| File | Pattern |
| --- | --- |
| `src/lib/engine-provider.tsx` | Status-polling effect kicks off an initial fetch that sets loading state |
| `src/lib/sentry-provider.tsx` | Records the result of `Sentry.init` into state from inside the effect |
| `src/hooks/use-updater.ts` | Auto-check-for-updates effect sets checking state before awaiting |
| `src/components/containers/container-logs-form.tsx` | Log fetch sets loading state before awaiting |
| `src/components/images/common/tag-selector.tsx` (x2) | `filteredSuggestions` and `inputValue` are derived state synced by effects |
| `src/components/layout/sidebar.tsx` | `collapsed` mirrors `config.sidebar_collapsed` |
| `src/components/settings/engine-settings/hooks/use-engine-settings-state.ts` | Colima support probe clears its error state before awaiting |

## Technical Requirements

- Replace derived-state-plus-effect pairs (`tag-selector`, `sidebar`) with `useMemo` or with state
  computed during render, so there is no second render pass.
- For the data-fetch sites, move the loading flag out of the synchronous effect body - either into
  the async helper after its first `await`, or by deriving it from the request state.
- Remove each `eslint-disable-next-line react-hooks/set-state-in-effect` comment as its site is fixed.
- The rule must be clean with no suppressions left when this ticket closes.

## Acceptance Criteria

- [ ] `npm run lint` passes with no `react-hooks/set-state-in-effect` suppressions in the codebase
- [ ] Engine status polling, update checks, and container log loading behave unchanged end to end
- [ ] Sidebar collapse state still round-trips through config without flicker
- [ ] Tag selector suggestion filtering and prop syncing behave unchanged

## Dependencies

- Introduced by the `eslint-plugin-react-hooks` 5.x -> 7.x upgrade
