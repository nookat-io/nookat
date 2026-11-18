# [TECH-001] Report test coverage in CI

- **Status:** Partially done
- **Merged from:** TECH-004
- **Related:** TECH-002, TECH-003

## Problem

There are unit tests on both sides of the app, but nobody can see which code they cover or whether coverage drops.
Quality gates exist, yet there is no view of how quality changes over time.

## Current state

- Frontend: 43 Vitest test files (`src/**/*.test.ts(x)`) with Testing Library in jsdom, configured in the `test` block of `vite.config.ts` with setup in `src/tests/setup.ts`.
- Backend: 208 Rust tests (`#[test]` and `#[tokio::test]`) inside `src-tauri/src`.
- `.github/workflows/ci.yml` runs ESLint with `--max-warnings=0`, `tsc --noEmit`, `npm test` and `cargo fmt --check`, then `pre-commit run --all-files`, which adds `cargo check` and `cargo test`.
- Dependabot keeps npm and Cargo dependencies current (`.github/dependabot.yml`).
- Clippy is not enforced on `main`.
  The open #230 adds `cargo clippy --all-targets -- -D warnings` to the pre-commit checks.
- Nothing measures coverage: no `@vitest/coverage-v8`, no `cargo llvm-cov`, no upload to a coverage service.

## Scope

- Add `@vitest/coverage-v8` and a `coverage` block to the Vitest config, with an `npm run test:coverage` script.
- Measure Rust coverage with `cargo llvm-cov` in CI.
- Publish both reports on every pull request, for example through Codecov or a job summary, and show the change against `main`.
- Start without a failing threshold, then add one at the level the suite actually reaches, so coverage can't silently drop.
- Track the trend of coverage, lint warnings and test count on `main` over time (the remaining part of TECH-004).

## Notes

- Measure first and pick thresholds afterwards; a target chosen in advance tends to produce low-value tests.
- The macOS-only modules such as `src-tauri/src/services/engine/macos.rs` and `src-tauri/src/services/shell/macos.rs` don't compile on Linux, so Linux CI coverage leaves them out.
  Covering them needs a macOS runner.
- Coverage of real Docker behaviour belongs to TECH-002, and of whole user flows to TECH-003.
