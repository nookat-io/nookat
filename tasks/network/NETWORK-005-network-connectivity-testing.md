# [NETWORK-005] Test connectivity between containers

- **Status:** Not started
- **Merged from:** DEBUG-003
- **Related:** NETWORK-007, MONITOR-003

## Problem

When one container cannot reach another, users have to exec into it and guess which tools exist.
Nookat should answer "can container A reach B on port P, and does the name resolve" from the UI.
DEBUG-003 (network connectivity testing tools) asked for the same thing, so it is folded in here.

## Current state

Nothing exists.
The backend already runs commands inside containers through exec in `src-tauri/src/services/containers.rs`, used to find a shell for `open_terminal`.

## Scope

- Add a connectivity check that, from a source container, resolves a target name and opens a TCP connection to a target port.
- Offer the target as another container (by name or alias on a shared network), a host name, or an IP address.
- Report each step separately: shared network or not, DNS result, TCP connect result and time, with the raw error when a step fails.
- Add a ping check where the source container has the tools for it.
- Open the check from a container's row actions and from the network detail view in NETWORK-007.

## Notes

- Many images ship without `ping`, `nslookup`, `nc` or even a shell, so an exec-based check fails on them.
- Open question: run the checks through exec when the tools exist and fall back to a short-lived helper container (for example `nicolaka/netshoot`) that joins the source container's network namespace, or always use the helper.
  The helper needs an image pull and must be cleaned up after the check.
- The result should say plainly when two containers share no network, since that is the most common cause.
