# [MODEL-001] Add a Models page to run local LLMs through Colima's model runner

- **Status:** Not started
- **Related:** #214, DIST-013, ENGINE-009, PERF-004

## Problem

Running an LLM locally with no network is now a normal part of a developer's day: on a plane, on a client network that blocks external APIs, or with data that must not leave the laptop.
Docker Desktop covers this with Docker Model Runner (`docker model run`) and its Models tab.
Colima covers it too since v0.10.0 (February 2026) with `colima model run` and `colima model serve`, on the `krunkit` VM type with GPU access on Apple silicon.
Since v0.10.1 its default runner is Docker Model Runner, with Ramalama as the alternative.
Colima users get all of this only as a command line tool.
Nookat already installs and manages Colima, so the missing piece is the GUI, and without it Nookat falls behind the Docker Desktop it replaces.

## Current state

- Nookat pins Colima 0.10.3 in `src-tauri/src/services/binary_install/releases.rs`.
  Its `colima model` command has its own `setup` (alias `update`) and `serve` subcommands and passes every other argument to the selected runner inside the VM.
  It requires the `docker` runtime and the `krunkit` VM type.
- `ColimaVmType` in `src-tauri/src/entities/engine/colima.rs` and `src/components/settings/engine-settings/types.ts` already knows `krunkit`, and `src-tauri/src/services/colima/profile.rs` reads it from a profile's config.
  `vm_type_for` in `src-tauri/src/services/colima/defaults.rs` only ever picks `vz` or `qemu`, so Nookat never starts a `krunkit` VM itself.
- Nookat does not install `krunkit`; Colima's documentation installs it from the `slp/krun` Homebrew tap.
- `src/App.tsx` has routes for containers, images, networks, volumes and settings only, and `EngineState` has no models.
- Long operations stream their progress through events such as `installation-progress`, emitted from `src-tauri/src/services/engine/macos.rs`.

## Scope

Build the page on top of `colima model`, not on a runtime of Nookat's own.

### Measure before building

- Run the same model at the same quantization through `colima model run` on `krunkit` and through Ollama natively on the host.
- Record prefill tok/s, decode tok/s and resident memory for both in this task.
- GPU access inside `krunkit` is new and still marked experimental.
  If decode there is far behind native, people who care about speed stay with Ollama or LM Studio, and the page is not worth building.

### Engine readiness

- Detect whether the current Colima instance can run models: Apple silicon, macOS 13 or later, `krunkit` installed, and the `krunkit` VM type.
- Offer to set up what is missing, the same way Nookat offers to install Colima itself.
- Show a clear "not available on this Mac" state on Intel Macs and on macOS below 13, since Nookat itself supports macOS 11 and later.

### Models

- A Models page next to Containers, Images, Volumes and Networks.
- List pulled models with name, quantization, size on disk and source registry, and mark what is available offline right now.
- Pull and remove models, with progress streamed through events the way `installation-progress` works.
- Start and stop a model, show its local endpoint (the OpenAI-compatible API and the chat UI that `colima model serve` opens on `http://localhost:8080` by default), and copy it to the clipboard so any client can use it.

### Honest metrics

- Show prefill and decode tok/s separately, never one blended "tokens per second".
  Prefill is compute-bound, while decode at batch size 1 is bound by memory bandwidth.
- Next to decode, show its ceiling, the memory bandwidth divided by the model size in bytes, so it is visible how close the machine gets to its own limit.

### Done when

- On an Apple silicon Mac with macOS 13 or later, Nookat sets up a `krunkit` engine, pulls a model, serves it, and a client reaches it through the copied endpoint with the network turned off.
- The page shows prefill and decode tok/s and the decode ceiling for the running model.
- On an Intel Mac or on macOS below 13 the page explains why models are not available instead of failing.

## Notes

- The benchmark decides whether the rest of this task is built at all.
- Open questions to answer before implementation:
  - Can an existing `vz` instance be restarted as `krunkit` without losing containers and volumes, or do models need a separate Colima profile?
    Colima's documentation suggests a restart with `--vm-type krunkit` but does not say what happens to existing data.
  - Does Nookat reach the runner through the `colima model` CLI only, or through Docker Model Runner's HTTP API inside the VM?
  - Models live on the VM disk (`colima start --disk`), so how should the page show and manage that space?
- With DIST-013 the Nookat Engine would have to bundle and sign `krunkit` as well, or keep installing it separately.
- Out of scope for the first iteration: Linux and Windows.
  Docker Model Runner also runs on Docker Engine on Linux with CPU, CUDA, ROCm and Vulkan backends, so a follow-up can reuse the page there.
- A rough mockup from #214, with illustrative numbers:

  ```
  Models                                              [ Pull model ]
  ------------------------------------------------------------------
   Name          Quant    Size     Offline   Status
   gemma3:4b     Q4_K_M   3.3 GB   yes       serving  localhost:8080
   qwen3:0.6b    Q4_K_M   0.5 GB   yes       stopped
  ------------------------------------------------------------------
   gemma3:4b     prefill 410 tok/s    decode 30 tok/s
                 decode ceiling ~36 tok/s  (120 GB/s / 3.3 GB)
  ```

- Alternatives considered:
  - Bundle a runtime of our own, llama.cpp or Ollama as a sidecar: more control, but a second engine to ship, update and sign, and it duplicates what Colima already provides.
  - Talk to Ollama on the host: works today and runs on Metal natively, but it is a separate install outside the engine Nookat manages.
