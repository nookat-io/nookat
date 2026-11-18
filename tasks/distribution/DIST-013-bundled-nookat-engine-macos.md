# [DIST-013] Ship Colima inside Nookat as the built-in Nookat Engine on macOS

- **Status:** Not started
- **Related:** DIST-003, DIST-004, DIST-008, ENGINE-008, ENGINE-009, TRAY-005, UX-004, #74, #214

## Problem

On macOS Nookat feels like a GUI for Colima rather than a product that runs containers on its own.
Installing the engine needs GitHub and download.docker.com, or Homebrew, and the first VM start downloads a disk image of 317-342 MB from GitHub.
Colima shows up across the UI: "Colima Engine", "Install Colima", a choice between Homebrew and Binary, the "Colima profile", "Use Colima for docker commands", and errors that quote Colima as it is.
Nookat drives the same `default` profile in `~/.colima` as a Colima the user runs themselves, so the two start, stop and reconfigure one VM.
Colima also changes the user's configuration outside Nookat: it adds an `Include` line to `~/.ssh/config`, creates a `colima` Docker context on every start and switches the terminal to it.
The terminal gets nothing from Nookat in return: no `docker`, no Compose and no Buildx.

## Current state

- `install_pinned_releases` in `src-tauri/src/services/engine/macos.rs` downloads Colima 0.10.3, Lima 2.2.1 and the Docker CLI 29.10.0, pinned with SHA-256 digests in `src-tauri/src/services/binary_install/releases.rs`.
- `install_releases` in `src-tauri/src/services/binary_install/installer.rs` verifies each download, unpacks it into a staging directory, runs each binary's `--version` and swaps the result into `~/.nookat/engine` atomically.
- The Homebrew method installs `colima` and `docker` through `brew` (`install_via_homebrew` in `src-tauri/src/services/engine/macos.rs`).
- `engine_bin_dir` in `src-tauri/src/services/shell/macos.rs` puts `~/.nookat/engine/bin` first on the PATH of Nookat's own commands only.
- `colima_start_args` in `src-tauri/src/services/colima/start_args.rs` passes the profile, resources, VM and mount type, Rosetta, port forwarder and inotify, but neither `--ssh-config=false` nor `--activate=false`, so both stay at Colima's default of true.
- `colima_home` in `src-tauri/src/services/colima/profile.rs` resolves `COLIMA_HOME` or `~/.colima`, and the profile defaults to `default` with the `colima` Docker context.
- `use_colima_docker_context` switches the user's Docker CLI to that context from Settings (`src/components/settings/engine-settings/components/docker-context-notice.tsx`).
- The user-facing Colima wording lives in `src/components/settings/engine-settings/`, `src/components/layout/header.tsx` and `src/types/engine-status.ts`.
- `.github/workflows/build-macos.yaml` builds one ad-hoc signed `universal-apple-darwin` app, and the v0.1.8 DMG is 22 MB.
- Nothing starts the engine when Nookat starts: `StartupSettings` in `src/types/config.ts` covers only the app itself.

## Scope

### Bundle the engine

- Move the pinned versions, URLs and SHA-256 digests out of `releases.rs` into one manifest that both the Rust code and the build read.
- Add a build step to `build-macos.yaml`, plus a `just` recipe for local builds, that downloads the pinned artifacts, verifies their digests and stages them for `bundle.resources` in a new `src-tauri/tauri.macos.conf.json`.
  The artifacts land in `Nookat.app/Contents/Resources/engine/`.
- Build `aarch64-apple-darwin` and `x86_64-apple-darwin` separately instead of `universal-apple-darwin`, so each DMG carries only its own engine.
  Publish per-architecture entries in the updater manifest instead of `updaterJsonKeepUniversal`.
- Install from the bundle into `~/.nookat/engine` with the existing installer.
  Replace the download in `install_releases` with a read of the bundled artifact, and keep the digest check, the version check and the atomic swap.
- After a Nookat update, upgrade `~/.nookat/engine` only when the bundled versions are newer, and only while the VM is stopped.
- Keep downloading the VM disk image on the first start, shown as a step of the Nookat setup.
- Ship the LICENSE and NOTICE files of Colima (MIT), Lima (Apache-2.0) and the Docker CLI (Apache-2.0), and show them in an About > Open source licenses screen with "Powered by Colima and Lima".

### Isolate the engine from the user's own tools

- Run every Colima command with `COLIMA_HOME=~/.nookat/vm`, so Lima lives in `~/.nookat/vm/_lima`, and with a profile Nookat owns.
- Always pass `--ssh-config=false` and `--activate=false`.
- Run Colima with `DOCKER_CONFIG=~/.nookat/docker`, so the context Colima creates on every start stays out of the user's `~/.docker`.
- Create a `nookat` Docker context in the user's `~/.docker` that points at the engine socket.
  Switch to it only when the user agrees, the way OrbStack adds `orbstack` and Docker Desktop adds `desktop-linux`.
- Point the Docker context notice in Settings and the UX-004 reasons at the `nookat` context instead of `colima`.

### Make it a product

- On a first launch without an engine, skip the installation method choice: unpack, start the VM and show one progress view.
- Replace every user-facing "Colima" with "Nookat Engine".
- Translate Colima and Lima errors into Nookat messages and keep their raw output in the logs.
- Keep connecting to an engine the user already runs as an advanced option: Docker Desktop, OrbStack, their own Colima, or Apple container from ENGINE-009.
- Bundle Docker Compose, Docker Buildx and `docker-credential-osxkeychain` next to the Docker CLI and link them into `~/.nookat/bin`.
  Add that directory to the user's shell PATH when the user agrees.
- Offer a privileged helper (`SMAppService`) that links `/var/run/docker.sock` to the engine socket, for Testcontainers and IDEs that look only there.
- Add settings to start the engine when Nookat starts and to stop it when Nookat quits.
- Add "Reset engine" and "Uninstall engine" to Settings.
  They remove `~/.nookat/vm`, `~/.nookat/engine`, `~/.nookat/bin`, the `nookat` context, the PATH line and the helper.

### Move existing users over without losing data

- Users who installed Colima through Nookat so far keep their images and volumes in `~/.colima/default`.
  Switching them silently to `~/.nookat/vm` would make that data look lost.
- Start the Nookat Engine fresh and keep the old profile reachable as an external engine.
  Tell the user where the old data is and how to remove it.
- Do not move VM disks between homes.

### Done when

- On a Mac without Homebrew, Nookat installs the engine from the DMG without network access and starts it, downloading only the VM image on the first start.
- The UI never mentions Colima or Lima outside About > Open source licenses.
- Nookat writes nothing to `~/.colima`, `~/.lima` or `~/.ssh/config`.
- `docker context ls` in the user's terminal shows `nookat` only after the user agreed.
- A Colima the user installs separately keeps working next to the Nookat Engine.
- After the user agrees, `docker`, `docker compose` and `docker buildx` work in a new terminal.
- Updating Nookat while the VM runs keeps the VM running, and the engine is upgraded on the next stop.
- "Uninstall engine" leaves no Nookat Engine files, contexts, PATH entries or helpers behind.

## Notes

- Never run the engine straight from `Nookat.app`.
  The Tauri updater replaces the whole bundle while Lima's host agent keeps running, and App Translocation runs an app opened from Downloads or from the DMG at a random read-only path.
- Colima creates its context with a plain `docker context create` (`setupContext` in `environment/container/docker/context.go`, v0.10.3), which should honour `DOCKER_CONFIG`.
  Verify this before relying on it.
- Signing:
  - Today's ad-hoc builds need nothing new: Nookat unpacks the binaries itself, so they carry no quarantine attribute, just like the downloaded ones now.
  - With DIST-008, every Mach-O in the bundle needs the Developer ID signature and the hardened runtime.
  - `limactl` must keep `com.apple.security.virtualization`, `com.apple.security.network.client` and `com.apple.security.network.server`, or the `vz` driver stops working.
  - Re-signing changes the binaries' digests, so the bundled source must then trust the app's signature instead of the upstream SHA-256 digests.
  - The `/var/run/docker.sock` helper needs the Developer ID signature too, so it waits for DIST-008.
- Sizes:
  - Apple silicon: Colima 15.7 MB, Lima 38.3 MB and the Docker CLI 10.3 MB, so 64.3 MB to bundle and 130.5 MB unpacked.
  - Intel: 53.1 MB to bundle and 103.7 MB unpacked.
  - The VM images Colima 0.10.3 cached on a development Mac are 317 MB and 342 MB.
  - Expected DMGs: about 80 MB for Apple silicon, against about 140 MB for a universal build with both engines.
- The new engine settings are new config fields, so they need a `v3.rs` as described under Config versioning in `CLAUDE.md`.
- The Homebrew cask from DIST-003 must `zap` `~/.nookat/vm`, `~/.nookat/engine` and `~/.nookat/bin` as well.
- A bundled VM engine rules out the Mac App Store sandbox, which DIST-004 already questions.
- Open question: an offline DMG that also bundles the VM image and starts Colima with `--disk-image`.
  Colima 0.10.3 accepts the official image there without `--force-disk-image`, but the DMG grows to about 420 MB for Apple silicon and every Nookat update downloads it again.
- Alternatives considered:
  - Keep downloading the engine at install time, as today: it needs GitHub at install time and keeps Colima visible.
  - A `.pkg` installer with a postinstall script: Tauri does not build one, it needs an administrator password, and uninstalling is harder.
  - Drive Lima directly without Colima: full control over names and paths, but Nookat would own Docker provisioning in the VM, the colima-core images, inotify propagation, Rosetta, networking, k3s and `colima model`, which #214 depends on.
    Everything this task needs is reachable through Colima's flags and environment.
  - Replace Colima with Apple container: it runs only on Apple silicon with macOS 26 and has no Docker API or Compose, so it is an additional engine in ENGINE-009.
  - Fork Colima to rename its processes: `colima` and `limactl` in Activity Monitor are acceptable, and Docker Desktop shows its own processes too.
- #74 left the question "Should we automatically bundle colima binaries to Nookat binary?" open, and this task answers it.
