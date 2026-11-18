# [ENGINE-006] Sign in to Docker Hub and other registries

- **Status:** Not started
- **Merged from:** ENGINE-007
- **Related:** IMAGE-006

## Problem

Users need to sign in to Docker Hub to pull private images and to avoid anonymous pull rate limits.
They also use private registries such as GitHub Container Registry, AWS ECR, Google Artifact Registry and Azure Container Registry.
Nookat has no way to sign in to any of them, so private pulls fail and pushes are impossible.

## Current state

- `ImagesService::pull_image` in `src-tauri/src/services/images.rs` calls bollard's `create_image` with `None` for credentials.
- The registry selector in `src/components/images/common/registry-selector.tsx` offers `docker.io` or a custom host name, without any authentication.
- There is no login command and nothing reads `~/.docker/config.json` or a Docker credential helper.

## Scope

- A Registries section in Settings that lists the registries the user is signed in to.
- Sign in with a username and a password or access token, checked against the registry before saving (Docker's auth endpoint, `docker login`).
- Sign out of a registry.
- Pass the matching credentials to pulls, and later to pushes (IMAGE-006).
- Show a clear message when a pull fails because the registry needs a sign-in, with a button that opens the sign-in form.
- Cloud registries whose tokens expire (ECR, Artifact Registry, ACR) through their Docker credential helpers.

## Notes

- Open question: where to store credentials.
  Sharing them with the Docker CLI is likely what users expect.
  - Reuse Docker's own store (`~/.docker/config.json` and the configured credential helper, for example `osxkeychain`), so `docker login` in a terminal and Nookat share sign-ins.
  - Or store them in the OS keychain under Nookat's own name.
- Never write passwords or tokens to `~/.nookat/config.json` or to the logs.
