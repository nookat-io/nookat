# Tasks

Planned work for Nookat, one Markdown file per task.

## Layout

Tasks live in `tasks/<area>/<AREA>-<NNN>-<slug>.md`, for example `tasks/monitor/MONITOR-001-real-time-resource-usage-graphs.md`.
A new task takes the next unused number in its area, and a number is never given to a second task.

## Lifecycle

Delete a task in the pull request that finishes it.
When one task absorbs another, delete the absorbed file and list its ID under `Merged from`.
Every remaining task has one of these statuses:

- `Not started` - nothing in the app does this yet.
- `Partially done` - part of it has shipped, and `Current state` says which part.
- `Blocked` - it waits on something outside the code, named under `Blocked by`.

## Roadmap

`ROADMAP.md` puts every task into a release.
A pull request that adds a task places it in a release there, and one that deletes a finished task removes its line there.

## Template

```markdown
# [AREA-NNN] Short imperative title

- **Status:** Not started
- **Blocked by:** what outside the code it waits on (only for Blocked)
- **Merged from:** IDs of the tasks it absorbed (only if any)
- **Related:** GitHub issues and task IDs (only if any)

## Problem

Why users need this.

## Current state

What already exists, with repo-relative paths, or that nothing does.

## Scope

- The concrete pieces of work.

## Notes

- Dependencies, risks and open questions.
```

Write one sentence per line and refer to other tasks by ID.
