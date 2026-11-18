# [NETWORK-004] Add inter-container isolation and a subnet overlap check to network creation

- **Status:** Partially done
- **Merged from:** NETWORK-003
- **Related:** NETWORK-007

## Problem

The Create Network dialog covers the common settings, but two gaps remain.
Users cannot stop containers on the same bridge network from talking to each other.
A subnet that overlaps an existing network is only rejected by Docker after submitting, with Docker's raw error.

## Current state

- `src/components/networks/network-create-dialog.tsx` creates networks with a driver, IPv4 and IPv6 addressing, labels, and the Internal and Attachable toggles.
- `src-tauri/src/services/networks/create_request.rs` validates names, subnets, gateways and IP ranges, including that the gateway and range sit inside the subnet.
- It does not compare a new subnet with the subnets of existing networks.
- There is no option for `com.docker.network.bridge.enable_icc`.

## Scope

- Add an "Isolate containers" toggle for the bridge driver that sets `com.docker.network.bridge.enable_icc` to `false`.
- Explain in the toggle's description that containers on the network can still reach the outside unless the network is also Internal.
- Before creating the network, check the requested IPv4 and IPv6 subnets against the subnets of existing networks in the engine state.
- Show an overlap as a field error that names the conflicting network.
- Cover both checks with unit tests in `src-tauri/src/services/networks/create_request.rs` and next to `src/components/networks/network-create-form.ts`.

## Notes

- The original task also asked for security policies and access control rules between containers.
  Docker has no API for per-container network policies, so that part is dropped; isolation is limited to Internal and the ICC option.
- Docker's default address pools can still assign an overlapping subnet when the user leaves the subnet empty; this task only checks subnets the user types.
