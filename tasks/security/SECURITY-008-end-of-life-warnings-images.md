# [SECURITY-008] Warn about end-of-life software in images

- **Status:** Not started
- **Related:** #123, SECURITY-001, SECURITY-002, SECURITY-007, PERF-004

## Problem

Users cannot see whether an image is built on an operating system release or a language runtime that has reached its end of life, such as `debian:buster`, `node:16` or `python:3.8`.
Software past its end of life gets no more security fixes, so every new vulnerability in it stays open for good.
A vulnerability scan (SECURITY-001) lists the CVEs known today, but it does not say that an image's base will never be fixed or that support ends next month.
Many organizations also have to track end-of-life software for audits.

## Current state

- Nothing in the app knows about end-of-life dates or queries a source for them.
- `Image` in `src-tauri/src/entities/images.rs` carries only the ID, repository, tag, creation time, size, and whether the image is in use or dangling.
- Nothing inspects an image or reads its contents: SECURITY-002 adds image inspect, and SECURITY-001 adds a scanner.
- The Images table (`src/components/images/images-table.tsx`) shows no status badges, and `src/components/images/image-filter.ts` filters only by the existing fields.

## Scope

### Detect what an image runs on

- Read the operating system and its version from `/etc/os-release` inside the image.
- Detect the language runtimes the image ships and their versions, at least Node.js, Python, Java, Go, Ruby, PHP and .NET.
- Remember the detected components per image ID, since an image's contents never change.

### Match them against end-of-life dates

- Take the end-of-life dates from endoflife.date (`https://endoflife.date/api/v1/products/<product>/`).
- Cache the dates locally and refresh them in the background, so the check works offline with the last known dates.
- Re-match the stored components whenever the dates refresh, without reading the images again.

### Show the result

- A badge in the Images table: one color when support ends within 30 days, another when it has ended.
- An image detail section that lists each component with its version, its end-of-life date and the oldest supported version to move to, with a link to its endoflife.date page.
- Filter and sort the Images table by end-of-life status.
- Check one image on demand, or several selected images at once.
- Run checks in the background with progress as described in PERF-004, and keep the rest of the UI usable while they run.

### Done when

- An image based on `debian:buster` shows as past its end of life, with the date and the Debian release to move to.
- An image whose runtime reaches its end of life within 30 days shows the warning badge.
- A distroless image and a `scratch` image are checked without failing, and an image with nothing to detect says so.
- With no network, the check still works from the cached dates and shows how old they are.

## Notes

- Open question: how to read files from an image.
  - Creating a container without starting it and reading files through the archive endpoint (`GET /containers/{id}/archive`, `download_from_container` in bollard) runs nothing from the image and also works for distroless images.
  - Running `cat /etc/os-release` in a short-lived container is simpler but fails on images without a shell or `cat`.
  - A pinned SBOM tool such as Syft through `binary_install` also finds packages, and SECURITY-001 may bring one in anyway.
- Share the OS and package detection with SECURITY-001 instead of building it twice.
- Image labels such as `org.opencontainers.image.base.name` name the base image directly, but most images do not set them.
- xeol (Apache-2.0) is a CLI that does this check, but its last release is v0.10.8 from 2025-03-05 and it needs its own database.
  endoflife.date is MIT licensed, updated daily, and has an open API.
- #123 also asked for severity levels and links to security advisories.
  Those belong to the CVE findings of SECURITY-001, while this task shows dates and the version to move to.
- Tracking the end-of-life status of images over time for compliance belongs to the report in SECURITY-007.
