# [ENGINE-005] Configure a proxy for the engine

- **Status:** Not started
- **Related:** ENGINE-004, ENGINE-008

## Problem

Users on corporate networks need an HTTP proxy so the engine can pull images and reach registries.
Today they have to configure it by hand inside the Colima VM or in Docker's daemon config.

## Current state

- Settings has a Proxy tab (`src/pages/SettingsPage.tsx`) that renders `src/components/settings/proxy-settings.tsx`.
- That component is a placeholder: HTTP proxy, HTTPS proxy, no proxy and authentication fields are all disabled, both cards carry a "Not available right now" badge, and the values live only in local React state.
- There is no backend command and no config field for a proxy.

## Scope

- Store the proxy settings (HTTP, HTTPS, no proxy list, optional username and password) in the app config.
  That needs a new config version next to `src-tauri/src/entities/config/v2.rs`, with a migration from V2.
- Apply them to the managed Colima engine:
  - the Docker daemon's `proxies` setting (`http-proxy`, `https-proxy`, `no-proxy`) in the `docker:` section of the profile's `colima.yaml`;
  - the VM environment (`env:` in `colima.yaml`), so pulls made inside the VM also use the proxy.
- Tell the user the change applies on the next VM start and offer a restart (ENGINE-008).
- Keep the password out of `~/.nookat/config.json` in plain text (see the credential storage question in ENGINE-006).
- Until this ships, hide the Proxy tab instead of showing disabled controls.

## Notes

- Verify how Colima handles proxies before building: whether it forwards the host's `HTTP_PROXY` variables on start, and whether `env:` and `docker: proxies` in `colima.yaml` are both needed.
- This shares the `colima.yaml` writing code with ENGINE-004 and should land after or with it.
- For engines Nookat does not manage, the tab can only explain where to set the proxy.
