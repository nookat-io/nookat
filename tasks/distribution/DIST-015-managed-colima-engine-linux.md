# [DIST-015] Install and run Colima as the managed engine on Linux

- **Status:** Not started
- **Related:** #55, DIST-002, DIST-006, DIST-013, DIST-016

## Problem

On Linux Nookat can only connect to a Docker daemon that already runs.
A user without one has to install Docker Engine on their own, which needs root, a system service and the `docker` group, and differs per distribution.
Until then every page in Nookat stays empty, and Engine Settings only says that engine management is available on macOS only.
On macOS Nookat installs, starts and configures Colima itself, so the same app behaves very differently on the two platforms.

## Current state

- `COLIMA_MANAGED` in `src-tauri/src/services/engine/mod.rs` is `cfg!(target_os = "macos")`.
  On every other platform `src-tauri/src/services/engine/unmanaged_colima.rs` answers each Colima command with the `colima_unmanaged()` error.
- `src-tauri/src/services/mod.rs` compiles `services/colima` and `services/binary_install` only for macOS and for Unix tests.
- `src-tauri/src/services/binary_install/releases.rs` pins only the `Darwin` builds of Colima 0.10.3, Lima 2.2.1 and the Docker CLI 29.10.0.
- `engine-configuration.tsx` in `src/components/settings/engine-settings/components/` shows the banner "Engine management is available on macOS only" when `is_colima_supported` returns false.
- `connect_to_docker` in `src-tauri/src/services/engine/mod.rs` tries `DOCKER_HOST`, then the Docker contexts, then `/var/run/docker.sock`, so a Docker Engine, a rootless Docker or a Colima the user runs is found already.
- Linux releases ship an AppImage, a `.deb` and an `.rpm` for x86_64 and aarch64 from `.github/workflows/build-linux.yaml`.
- Upstream, Colima 0.10.3 publishes `colima-Linux-x86_64` and `colima-Linux-aarch64`, Lima publishes Linux tarballs for both architectures, and Docker publishes static CLI builds under `download.docker.com/linux/static/stable/`.
- On Linux Lima runs the VM with QEMU, which the user has to install, and the `vz` and `krunkit` VM types exist only on macOS.

## Scope

### Share the engine code across platforms

- Compile `services/colima` and `services/binary_install` for Linux, and set `COLIMA_MANAGED` for Linux too.
- Add `src-tauri/src/services/engine/linux.rs` with the same functions as `macos.rs`, and stop using `unmanaged_colima.rs` on Linux.
- Move what `macos.rs` and `linux.rs` would duplicate (installing, starting, stopping, progress events) into shared code, and keep only the real platform differences in the platform files.

### Install the engine without root

- Pin the Linux builds of Colima, Lima and the Docker CLI for x86_64 and aarch64 with their SHA-256 digests next to the macOS ones.
- Install them into `~/.nookat/engine` with the existing installer: verify the digest, check each binary's `--version`, and swap the result in atomically.
- Stream the installation and the first VM start through the existing `installation-progress` and `vm-startup-*` events.

### Check the host before offering the engine

- Detect QEMU (`qemu-system-x86_64` or `qemu-system-aarch64`, and `qemu-img`) and read and write access to `/dev/kvm`.
- When something is missing, name it and show the command that fixes it for the user's distribution (`apt`, `dnf`, `pacman`, `zypper`), including adding the user to the `kvm` group.
- Do not install QEMU from Nookat, since it needs root and the distribution's package manager.
- Do not offer the engine without KVM, because QEMU then emulates the CPU in software and containers become too slow to use.

### Fit the engine next to a daemon the user already runs

- Offer the managed engine only when no engine answers, or when the user asks for it in Engine Settings.
- Never stop, replace or reconfigure a Docker Engine the user runs, and keep it the default when it answers.
- Show the same install, start, stop and resources UI as on macOS, and hide what only applies to macOS: Rosetta and the `vz` and `krunkit` VM types.
- Validate the engine after it starts with `docker version` and `docker info` through its socket.

### Done when

- On Ubuntu 24.04 and Fedora on x86_64, and on an aarch64 machine, with QEMU and KVM available and no Docker installed, Nookat installs the engine without a password prompt, starts it, and lists, runs and removes containers.
- On a machine where Docker Engine already runs, Nookat keeps using it and offers the managed engine only from Engine Settings.
- Without QEMU or without access to `/dev/kvm`, Engine Settings say what is missing and how to fix it instead of failing on start.
- The AppImage, `.deb` and `.rpm` builds all install and start the engine.
- The Linux platform build compiles and tests the Colima services.

## Notes

- A Docker Engine running natively on Linux needs no VM, so the managed engine costs memory and slower file sharing compared to it.
  It is for users without an engine, not a replacement for one that works.
- Bundling the engine inside the app is DIST-013 for macOS.
  A Linux follow-up can reuse its manifest of pinned versions and digests, and should be decided together with the Snap confinement question in DIST-006.
- Open question: which mount type to use on Linux hosts, weighing file sharing speed against what Colima supports with QEMU there.
- GitHub issue #55 is titled "[DIST-006]", but DIST-006 is now the Snap Store task.
- Alternatives considered:
  - Rootless Docker Engine (`dockerd-rootless-setuptool.sh`): native speed without a VM, but it needs `uidmap` and subordinate ID ranges set up by root, and it is a second engine to maintain next to Colima.
  - Docker Engine from the distribution's package manager: needs root and a system service, and the steps differ per distribution.
  - Keep connecting only to a daemon that already runs, as today: simplest, but it leaves users without Docker with nothing to do in Nookat.
