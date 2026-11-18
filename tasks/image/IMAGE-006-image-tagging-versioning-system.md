# [IMAGE-006] Tag and push images

- **Status:** Not started
- **Related:** ENGINE-006, IMAGE-005

## Problem

Users cannot give a local image another name or tag, or publish it to a registry, without the terminal.
Tagging and pushing are the usual next steps after building an image (IMAGE-005).

## Current state

- Nothing tags or pushes images.
- `fetch_image_tags` (`ImagesService::fetch_image_tags` in `src-tauri/src/services/images.rs`, called from `src/lib/docker.ts`) lists the remote tags of a repository so the pull dialog can offer them in `src/components/images/common/tag-selector.tsx`.
  It serves pulls only and never changes a local image.
- The Images table row menu in `src/components/images/images-table.tsx` offers only Delete.
- `to_image` in `src-tauri/src/services/images.rs` keeps only the first tag of each image, so an image with several tags shows one row with one tag.

## Scope

- A "Tag" action on an image row that adds a repository and tag to the image (`docker tag`), validated against Docker's reference rules.
- Removing a single tag from an image that has several, without deleting the image itself.
- A "Push" action that pushes a tag to its registry, with streamed progress in the same way as other long operations.
- Show every tag of an image in the table, not just the first one.

## Notes

- Pushing needs registry credentials, so it depends on ENGINE-006.
- The original ticket also asked for semantic versioning and release tracking.
  Open question: is any of that wanted beyond tag and push, given that Docker itself has no notion of versions?
