# [NETWORK-007] Add a network detail view and a container connection map

- **Status:** Not started
- **Related:** ORCHESTRATION-003, CONTAINER-007, NETWORK-005

## Problem

Users cannot see which containers are attached to a network, with which addresses, or which containers can reach each other.
That makes it hard to understand a multi-container setup or why two services cannot talk.

## Current state

- `src/components/networks/networks-table.tsx` lists name, driver, created, subnet, gateway and system columns.
- The attached container count (`containers` in `src-tauri/src/entities/networks.rs`) is only used to disable Delete; it is not shown.
- Each container carries its endpoints in `network_settings` (`src-tauri/src/entities/containers/network.rs`), with IP addresses, aliases, gateway and MAC address.
- There is no detail view for a network.

## Scope

- Add a network detail view, opened from the networks table, that lists the attached containers with their IPv4 and IPv6 addresses, aliases and MAC addresses.
- Show the network's driver, scope, IPAM config, options and labels in the same view.
- Show the attached container count as a column in the networks table.
- Add a map view that draws containers and networks as nodes and attachments as edges, built from the containers' `network_settings` in the engine state.
- Highlight which containers can reach each other because they share a network.

## Notes

- The detail view and the count column are the first step and are useful on their own.
- Showing real traffic flows between containers would need packet capture inside the engine VM; that is out of scope.
- Compose `depends_on` relations belong to ORCHESTRATION-003; the two views may share the same graph component.
- Connecting and disconnecting a container from the detail view belongs to CONTAINER-007.
