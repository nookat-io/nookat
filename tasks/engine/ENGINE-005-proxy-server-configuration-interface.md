# [ENGINE-005] Configure a proxy for the engine

- **Status:** Not started
- **Related:** ENGINE-004, ENGINE-008

## Problem

Users on corporate networks need an HTTP proxy so the engine can pull images and reach registries.
Today they have to configure it by hand inside the Colima VM or in Docker's daemon config.

## Current state

- Nothing: there is no proxy UI, no backend command and no config field for a proxy.
- Settings had a Proxy tab with disabled placeholder fields; it was removed until this ships (#238).

## Scope

- Store the proxy settings (HTTP, HTTPS, no proxy list, optional username and password) in the app config.
  That needs a new config version next to `src-tauri/src/entities/config/v2.rs`, with a migration from V2.
- Apply them to the managed Colima engine:
  - the Docker daemon's `proxies` setting (`http-proxy`, `https-proxy`, `no-proxy`) in the `docker:` section of the profile's `colima.yaml`;
  - the VM environment (`env:` in `colima.yaml`), so pulls made inside the VM also use the proxy.
- Tell the user the change applies on the next VM start and offer a restart (ENGINE-008).
- Keep the password out of `~/.nookat/config.json` in plain text (see the credential storage question in ENGINE-006).
- Add a Proxy tab to Settings (`src/pages/SettingsPage.tsx`) once the settings above are stored and applied.

## Notes

- Verify how Colima handles proxies before building: whether it forwards the host's `HTTP_PROXY` variables on start, and whether `env:` and `docker: proxies` in `colima.yaml` are both needed.
- This shares the `colima.yaml` writing code with ENGINE-004 and should land after or with it.
- For engines Nookat does not manage, the tab can only explain where to set the proxy.
