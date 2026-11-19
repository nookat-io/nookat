# Roadmap

This roadmap puts every task in `tasks/` into a release.
A release ships every two weeks, and the timing of each one is set separately, so this file names only the release and its scope.
Release numbers continue from v0.1.9, and the public launch takes v0.2.0.

## Direction

Nookat is moving to local model inference for local development.
A developer builds an LLM feature on a laptop: the app runs in containers, and the model it talks to runs on the same machine.
Colima stays the engine underneath, and it is hidden from the product.
Containers stay, because the app under development lives in them.
Before the launch, the first install has to work without friction, and Nookat needs one thing that Ollama, LM Studio and Docker Model Runner do not do.

## How the order was chosen

- Fix the first install before the launch: a notarized app, a Homebrew cask, an engine that installs itself, and errors that say what to do.
- Decide before building: the model engine measurement comes before the Models page, and the conversations with developers come before the wedge.
- After the launch, the developer's daily loop comes first: Compose, logs, proxies and registries, and what happens inside a container.
- Then breadth: images, Linux, networks, data and security.
- Translations, policy and compliance features, and the blocked Windows work come last.
- No task ships before a task it depends on.
- Each release has one theme and one to four tasks, and a release that carries one of the largest tasks carries little else.

## How to use it

- A release is a train: it ships at the end of its two weeks with what is merged, and an unfinished task moves to the next release instead of holding the tag.
- The launch is the exception: v0.2.0 ships only after the Models page (v0.1.12) and the wedge (v0.1.13) are out.
- Bug fixes go into the next release and are not listed here.
- A pull request that deletes a finished task also removes its line from this file, and a pull request that adds a task places it in a release here.
- The order after v0.2.0 is the best guess before the launch; re-rank it with the launch feedback and the funnel events from v0.1.12.
- A blocked task names what unblocks it, and its release moves up as soon as the blocker clears.

## Overview

| Release | Theme | Tasks |
| --- | --- | --- |
| v0.1.10 | Trust on first install | DIST-008, DIST-003, UX-004, UX-006 |
| v0.1.11 | Nookat Engine | DIST-013, ENGINE-008, DIST-004 |
| v0.1.12 | Models | MODEL-001, PERF-004 |
| v0.1.13 | The wedge | the wedge (new task), TECH-002 |
| v0.2.0 | Launch | TECH-003, UX-002, UX-003 |
| v0.2.1 | The Compose loop | DIST-007, ORCHESTRATION-001, MONITOR-004 |
| v0.2.2 | Proxies and private registries | ENGINE-006, ENGINE-004, ENGINE-005 |
| v0.2.3 | Inside a container | MONITOR-001, MONITOR-003, DEBUG-001 |
| v0.2.4 | At a glance | MONITOR-002, VOLUME-003, TRAY-005, TRAY-002 |
| v0.2.5 | Change containers after creation | CONTAINER-007, CONTAINER-008, VOLUME-004, NETWORK-004 |
| v0.2.6 | Reliable at scale | PERF-008, PERF-003, TECH-001 |
| v0.2.7 | Build and publish images | IMAGE-005, IMAGE-006 |
| v0.2.8 | Linux engine | DIST-015, DIST-006, LPAGE-001 |
| v0.2.9 | How containers connect | NETWORK-007, ORCHESTRATION-003, NETWORK-005 |
| v0.2.10 | Files and volume data | DEBUG-002, VOLUME-001 |
| v0.2.11 | Know your images | SECURITY-002, SECURITY-008, SECURITY-001 |
| v0.2.12 | Safe to run | SECURITY-004, SECURITY-003, DIST-002 |
| v0.2.13 | Apple container | ENGINE-009 |
| v0.2.14 | Languages | I18N-001, I18N-002, I18N-003 |
| v0.2.15 | Policies and reports | SECURITY-006, SECURITY-007 |
| v0.2.16 | Windows engine and Microsoft Store | DIST-001, DIST-016, DIST-005 |

## Decisions and purchases outside the code

| What | Needed by |
| --- | --- |
| Buy the Apple Developer Program membership ($99 a year). | v0.1.10 (DIST-008) |
| Fix the pass threshold, then run the #214 measurement: `colima model run` on `krunkit` against native Ollama, same model, same quantization, same Mac. | v0.1.11 and v0.1.12 |
| Hold ten conversations with developers who build LLM features locally, with the share that confirms the hypothesis set before the first one. | v0.1.13 |
| Decide whether the Models page comes to Linux. | v0.2.8 |
| Buy a Windows code-signing certificate or an Azure Trusted Signing account, and open a Partner Center account. | v0.2.16 |
| Colima publishes a release with Windows binaries, which is outside our control. | v0.2.16 |

## Work with no task yet

The product direction asks for work that no task covers yet.
Write a task for each before its release starts.

| Work | Release |
| --- | --- |
| Opt-in funnel events in Aptabase: app started, engine ready, model downloaded, first request served. | v0.1.12 |
| The model reachable from any container under one stable host name, with no network setup; add it to MODEL-001. | v0.1.12 |
| The default catalog: which small models are offered and where they come from; add it to MODEL-001. | v0.1.12 |
| The wedge, whose leading hypothesis is that every model call from the app is visible. | v0.1.13 |
| Models pinned per project, so a team runs the same model. | v0.2.1 |

## v0.1.10 - Trust on first install

**Outcome:** A new Mac user installs Nookat from a notarized DMG or with one `brew` command without allowing it in Privacy & Security, and when the engine cannot be reached, Nookat says why and what to do next.

- **[DIST-008](distribution/DIST-008-macos-code-signing-notarization.md)** Sign and notarize the macOS build.
  It is blocked only by the Apple Developer Program membership, so buy it before the release starts.
- **[DIST-003](distribution/DIST-003-homebrew-cask.md)** Publish a Homebrew cask.
  Start with the `nookat-io/homebrew-tap` tap, so `brew install --cask nookat-io/tap/nookat` works, and submit to `homebrew/cask` once the app is notarized.
- **[UX-004](ux/UX-004-improve-engine-status-monitoring.md)** Explain why the engine is unreachable.
  Also replace the "Engine management is available on macOS only" banner on Windows with the engines Nookat works with there, as DIST-016 suggests.
- **[UX-006](ux/UX-006-enhance-loading-states-error-handling.md)** Add an error boundary and loading skeletons.
  A blank window is the worst first impression a new user can get.

**Runs alongside:** the #214 measurement, which is the first step of MODEL-001, and the ten conversations.
Both feed later releases and need no code.

## v0.1.11 - Nookat Engine

**Outcome:** On macOS the engine ships inside the DMG as the Nookat Engine.
It installs without network access apart from the VM image, leaves `~/.colima`, `~/.ssh/config` and the user's Docker context alone, and gives the terminal `docker`, `docker compose` and `docker buildx` once the user agrees.

- **[DIST-013](distribution/DIST-013-bundled-nookat-engine-macos.md)** Ship Colima inside Nookat as the built-in Nookat Engine on macOS.
  It is the largest task in the roadmap, so the release carries only small tasks next to it.
  With DIST-008 done, every bundled Mach-O needs the Developer ID signature and the hardened runtime, and `limactl` keeps its virtualization entitlements.
  The #214 measurement decides whether `krunkit` is bundled with the engine.
  Add `~/.nookat/vm`, `~/.nookat/engine` and `~/.nookat/bin` to the `zap` stanza of the DIST-003 cask.
- **[ENGINE-008](engine/ENGINE-008-docker-engine-restart-functionality.md)** Restart the engine.
  It is small, and the engine settings in v0.2.2 offer it after every change.
- **[DIST-004](distribution/DIST-004-app-store-packaging-submission-macos.md)** Package and submit to the Mac App Store.
  Answer its viability question and nothing more: a bundled VM engine rules out the App Store sandbox, so the expected outcome is to close the task with that reason.

**Depends on:** the #214 measurement.

## v0.1.12 - Models

**Outcome:** On an Apple silicon Mac, a new user goes from install to a model answering a request from a container in a few minutes, without a terminal, checked on a clean macOS user account.

- **[MODEL-001](model/MODEL-001-models-page-local-llms.md)** Add a Models page to run local LLMs.
  Build it on the engine the #214 measurement chose: `colima model` on `krunkit` if the VM path passed, or a native engine on the host (llama.cpp or MLX) if it did not.
  In the second case, rewrite the task's scope before the release starts.
  Add the stable host name and the default catalog from "Work with no task yet" to its scope.
- **[PERF-004](perf/PERF-004-progress-cancellation-long-operations.md)** Show progress for long operations and let users cancel them.
  Model pulls take several GB, so they follow the same progress and cancel pattern as image pulls, the wizard pull, bulk actions, prunes and the engine install.
- **New: funnel events.**
  `page_viewed` alone cannot tell a model user from a container user, and the launch needs to be measured from its first day.

**Depends on:** v0.1.11.

## v0.1.13 - The wedge

**Outcome:** Nookat does one thing for a developer debugging an LLM feature that Ollama, LM Studio and Docker Model Runner do not.

- **New: the wedge**, in its smallest useful form.
  The ten conversations choose it.
  The leading hypothesis is that every model call from the app is visible: the prompt, tokens in and out, time to first token, prefill time against decode time, tok/s and KV cache reuse.
  If the conversations point elsewhere, their answer replaces this item and the release keeps its place.
- **[TECH-002](tech/TECH-002-integration-testing-framework.md)** Test the backend against a real Docker daemon.
  Before strangers try the app, CI should catch a bollard upgrade or a daemon that behaves differently from what the code expects.
  TECH-003 in v0.2.0 runs on the CI job with a Docker engine that this task adds.

**Depends on:** v0.1.12 and the ten conversations.

## v0.2.0 - Launch

**Outcome:** The public launch.
A visitor installs Nookat with one command, and the app feels finished to someone who tries it for five minutes.

- **[TECH-003](tech/TECH-003-end-to-end-testing.md)** Test whole user flows end to end.
  Lock in the flows the launch depends on before tagging it.
  Cover the flows its scope lists and add the Models page, which, like the engine setup, is macOS only and so runs against mocked IPC.
- **[UX-002](ux/UX-002-comprehensive-keyboard-shortcuts.md)** Add keyboard shortcuts.
  The app menu that lists them is where macOS users look first.
- **[UX-003](ux/UX-003-accessibility-improvements.md)** Fix accessibility gaps.

**Launch work outside the code:**

- A README that sells in one screen: a GIF on top, the one-line pitch and the `brew` command.
- A benchmark table from one M-series Mac with Nookat, Ollama, LM Studio and Docker Model Runner: decode tok/s, time to first token and memory.
- A comparison page on nookat.io with the same table.
- While the launch is live, merge only fixes.

**Depends on:** v0.1.10 to v0.1.13.

## v0.2.1 - The Compose loop

**Outcome:** A developer runs the app's Compose project from Nookat and watches its logs live, and new versions reach volunteers on a beta channel before everyone else.

- **[DIST-007](distribution/DIST-007-beta-channel-support.md)** Add a beta release channel.
  After the launch there are users to protect.
  Start with the updater and CI, and add Snap channels and Store flighting when those listings exist.
- **[ORCHESTRATION-001](orchestration/ORCHESTRATION-001-docker-compose-service-management.md)** Manage Docker Compose projects.
  Answer its open question with the Compose plugin that DIST-013 bundles, so behaviour stays identical to `docker compose`.
- **[MONITOR-004](monitor/MONITOR-004-log-aggregation-filtering.md)** Follow, tail and combine container logs, including the combined view of a Compose project.
- **New: models pinned per project.**
  Decide the mechanism once the project view exists, for example Compose's top-level `models:` element.

## v0.2.2 - Proxies and private registries

**Outcome:** Nookat works on a corporate network behind a proxy and pulls from private registries without the terminal.

- **[ENGINE-006](engine/ENGINE-006-registry-authentication.md)** Sign in to Docker Hub and other registries.
  It also lifts Docker Hub's anonymous pull limit, and IMAGE-006 needs it to push.
- **[ENGINE-004](engine/ENGINE-004-docker-daemon-configuration-editor.md)** Edit the Docker daemon config of the engine VM.
  Since DIST-013 it writes the profile Nookat owns, not `~/.colima`.
- **[ENGINE-005](engine/ENGINE-005-proxy-server-configuration-interface.md)** Configure a proxy for the engine.
  It shares the `colima.yaml` writer with ENGINE-004, so it lands after it.
  Check that model pulls go through the proxy too.

## v0.2.3 - Inside a container

**Outcome:** For a running container, users see live CPU, memory, network and disk graphs, its health, a plain-words reason when it dies, and the processes it runs.

- **[MONITOR-001](monitor/MONITOR-001-real-time-resource-usage-graphs.md)** Stream container resource stats and draw graphs.
  It adds the chart library that later releases reuse.
- **[MONITOR-003](monitor/MONITOR-003-container-health-checks.md)** Show container health and explain failures.
- **[DEBUG-001](debug/DEBUG-001-process-monitoring-containers.md)** Show the processes running in a container.

## v0.2.4 - At a glance

**Outcome:** The state of the engine is visible without visiting every page or even opening the window: an overview page, volume sizes, a live tray menu and desktop notifications.

- **[MONITOR-002](monitor/MONITOR-002-performance-metrics-dashboard.md)** Add a resource overview dashboard, built on MONITOR-001.
- **[VOLUME-003](volume/VOLUME-003-volume-size-analysis.md)** Show volume sizes, from the same `system df` call as MONITOR-002.
- **[TRAY-005](tray/TRAY-005-system-tray-menu-common-actions.md)** Show engine and container status in the tray menu.
  Consider listing the serving model next to the engine status, since a model server is mostly used from the menu bar.
- **[TRAY-002](tray/TRAY-002-system-tray-notifications-alerts.md)** Send desktop notifications.
  The health and resource alerts need MONITOR-003 and MONITOR-001 from v0.2.3.

## v0.2.5 - Change containers after creation

**Outcome:** A container's settings can be seen and changed after it is created, and the container and network creation flows close their known gaps.

- **[CONTAINER-007](container/CONTAINER-007-change-existing-container-settings.md)** Change the settings of an existing container.
  Its container inspect and details view are reused by VOLUME-004 here and by SECURITY-004 in v0.2.12.
- **[CONTAINER-008](container/CONTAINER-008-container-wizard-follow-ups.md)** Close the gaps in the container creation wizard.
- **[VOLUME-004](volume/VOLUME-004-volume-mount-point-visualization.md)** Show which containers use a volume, and a container's mounts in the CONTAINER-007 details.
- **[NETWORK-004](network/NETWORK-004-network-isolation-settings.md)** Add inter-container isolation and a subnet overlap check to network creation.

## v0.2.6 - Reliable at scale

**Outcome:** Bulk actions survive a failure and report every item, the backend stops reloading every list on every event, lists stay fast with 1000+ items, and every pull request shows its test coverage.

- **[PERF-008](perf/PERF-008-optimize-container-operations-1000-plus.md)** Keep the app fast with 1000+ containers.
  Its change detection bug, which compares list lengths, can be fixed earlier as a standalone bug fix and must be fixed before IMAGE-006.
  The integration tests from TECH-002 in v0.1.13 are the safety net for moving bulk actions into services.
- **[PERF-003](perf/PERF-003-memory-optimization-large-datasets.md)** Render large lists efficiently.
- **[TECH-001](tech/TECH-001-test-coverage-reporting.md)** Report test coverage in CI.

## v0.2.7 - Build and publish images

**Outcome:** The image workflow is complete in the app: build from a Dockerfile, tag, push, and run the result with the wizard.

- **[IMAGE-005](image/IMAGE-005-image-build.md)** Build images from a Dockerfile.
- **[IMAGE-006](image/IMAGE-006-image-tagging-versioning-system.md)** Tag and push images.
  It needs ENGINE-006 from v0.2.2 and the change detection from PERF-008 in v0.2.6.

## v0.2.8 - Linux engine

**Outcome:** A Linux user without Docker installs and runs the managed engine without root, and Nookat is in the Snap Store.

- **[DIST-015](distribution/DIST-015-managed-colima-engine-linux.md)** Install and run Colima as the managed engine on Linux.
- **[DIST-006](distribution/DIST-006-snap-craft-packaging-submission-ubuntu.md)** Package and submit to the Snap Store.
  Decide its confinement together with DIST-015, as both tasks ask.
- **[LPAGE-001](landing-page/LPAGE-001-update-landing-page-appstore-msstore-snapstore.md)** Add app store badges to the landing page, starting with the Snap Store.
  The `brew` command is already on the site through DIST-003, and the Microsoft Store badge follows DIST-005.

**Decision:** whether the Models page comes to Linux, using the launch data on Linux users.

## v0.2.9 - How containers connect

**Outcome:** Users see which containers share which networks, how the services of a Compose project depend on each other, and whether one container can reach another.

- **[NETWORK-007](network/NETWORK-007-container-communication-mapping.md)** Add a network detail view and a container connection map.
- **[ORCHESTRATION-003](orchestration/ORCHESTRATION-003-service-dependency-visualization.md)** Show how the services of a Compose project depend on each other.
  It shares the graph component with NETWORK-007 and reads compose files through ORCHESTRATION-001.
- **[NETWORK-005](network/NETWORK-005-network-connectivity-testing.md)** Test connectivity between containers, opened from the NETWORK-007 detail view.
  The model's host name from MODEL-001 is a natural target.

## v0.2.10 - Files and volume data

**Outcome:** Users browse, download and upload files in containers and volumes, and back up, restore and migrate volumes.

- **[DEBUG-002](debug/DEBUG-002-file-browser-containers-volumes.md)** Browse files in containers and volumes.
- **[VOLUME-001](volume/VOLUME-001-volume-backup-restore-functionality.md)** Back up, restore and migrate volumes.
  Migration also lets users move the data they left in their old Colima profile into the Nookat Engine from DIST-013.

Both reach a volume through a short-lived helper container, so build it once.

## v0.2.11 - Know your images

**Outcome:** For any local image, users see what it is made of, whether its OS or runtime is past its end of life, and which known CVEs it carries.

- **[SECURITY-002](security/SECURITY-002-image-layer-analysis.md)** Show image layers and history.
  The image inspect it adds feeds the other two tasks.
- **[SECURITY-008](security/SECURITY-008-end-of-life-warnings-images.md)** Warn about end-of-life software in images.
- **[SECURITY-001](security/SECURITY-001-vulnerability-scanning-images.md)** Scan images for known vulnerabilities.
  Share the OS and package detection with SECURITY-008.

## v0.2.12 - Safe to run

**Outcome:** Risky container settings are flagged before and after creation, image signatures are verified, and the Linux packages are signed.

- **[SECURITY-004](security/SECURITY-004-security-best-practices-recommendations.md)** Flag risky container settings.
  It needs the container inspect from CONTAINER-007.
- **[SECURITY-003](security/SECURITY-003-image-signing-verification.md)** Verify image signatures.
  Private registries need the sign-in from ENGINE-006.
- **[DIST-002](distribution/DIST-002-linux-code-signing.md)** Sign the Linux packages, and publish signed apt and yum repositories.

## v0.2.13 - Apple container

**Outcome:** On Apple silicon with macOS 26, Nookat runs on Apple container through socktainer, says plainly what that engine cannot do, and switches between engines without a restart.

- **[ENGINE-009](engine/ENGINE-009-apple-container-engine.md)** Support Apple container as an additional engine on macOS.
  It sits late on purpose: Apple container and socktainer are both under heavy development, and the engine picker builds on the Nookat Engine from DIST-013.

## v0.2.14 - Languages

**Outcome:** The UI, its error messages, and its dates and sizes follow the chosen language, with Russian as the second one.

- **[I18N-001](i18n/I18N-001-multi-language-ui-framework.md)** Translate the UI.
- **[I18N-002](i18n/I18N-002-localized-error-messages.md)** Translate error messages.
- **[I18N-003](i18n/I18N-003-regional-settings-support.md)** Format dates, numbers and sizes for the user's locale.

They sit late on purpose: I18N-002 changes the error type of every command, which costs less once most features have landed, and the launch audience reads English.

## v0.2.15 - Policies and reports

**Outcome:** Users who must enforce or prove the security state of their images get rules and an exported report.

- **[SECURITY-006](security/SECURITY-006-policy-enforcement-framework.md)** Enforce user-defined security rules.
- **[SECURITY-007](security/SECURITY-007-compliance-reporting-system.md)** Export a security report.

Both tasks ask whether a desktop app needs them at all.
They serve teams and audits rather than today's user, so answer that question first with who uses Nookat by then, and close them if no one needs them.

## v0.2.16 - Windows engine and Microsoft Store

**Outcome:** On Windows without Docker Desktop, Nookat installs and runs its own engine from a signed installer, and Nookat is in the Microsoft Store.

- **[DIST-001](distribution/DIST-001-windows-code-signing.md)** Sign the Windows build.
  It is blocked by a paid code-signing certificate.
- **[DIST-016](distribution/DIST-016-managed-colima-engine-windows.md)** Install and run Colima as the managed engine on Windows.
  It is blocked until Colima publishes a Windows release.
- **[DIST-005](distribution/DIST-005-windows-store-packaging-submission.md)** Package and submit to the Microsoft Store.
  It needs DIST-001 and is worth little without DIST-016.

This release sits last because both blockers are outside the code.
When they clear, it moves up, and DIST-001 can ship on its own as soon as the certificate exists.
