# [SECURITY-007] Export a security report

- **Status:** Not started
- **Related:** SECURITY-001, SECURITY-004, SECURITY-006

## Problem

Users who have to show the security state of their images and containers, for an audit or a review, have nothing to hand over.

## Current state

Nothing exists, and there are no scan results, findings or rule violations yet to report on.
Nookat stores only `~/.nookat/config.json`, so there is no history of past results.

## Scope

- Export the current vulnerability scan results, risky-settings findings and rule violations for selected images and containers to a file.
- Include image digests, the scan time and the scanner and database versions, so the report can be reproduced.

## Notes

- Depends on SECURITY-001, SECURITY-004 and SECURITY-006.
- Open question: whether to keep this task at all for a desktop app.
- Open question: the export format (Markdown, JSON or PDF), and whether to map findings to a standard such as the CIS Docker Benchmark.
- An audit trail over time would need storage that Nookat does not have and is out of scope.
