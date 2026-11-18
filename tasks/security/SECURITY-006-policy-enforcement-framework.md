# [SECURITY-006] Enforce user-defined security rules

- **Status:** Not started
- **Related:** SECURITY-001, SECURITY-003, SECURITY-004

## Problem

Warnings are easy to click past.
Some users want Nookat to stop a pull or a container start that breaks rules they chose, such as critical CVEs or privileged mode.

## Current state

Nothing enforces rules.
The only gate today is the lookalike confirmation before a pull (`src/lib/image-source/`), which the user can confirm past.

## Scope

- Let users turn chosen SECURITY-004 findings, SECURITY-001 severity thresholds and SECURITY-003 verification results into rules.
- Block, or require explicit confirmation for, a pull or a container creation that breaks a rule, and name the rule in the message.
- Store the rules in the app config, which means a new config version under `src-tauri/src/entities/config/`.

## Notes

- Depends on SECURITY-001 and SECURITY-004, and on SECURITY-003 for signature rules.
- Open question: whether a desktop app needs enforcement at all, since the Docker CLI bypasses it.
- Rules pushed by an organization admin are out of scope.
