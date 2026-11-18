# [ORCHESTRATION-003] Show how the services of a Compose project depend on each other

- **Status:** Not started
- **Related:** ORCHESTRATION-001, NETWORK-007

## Problem

In a Compose project with several services it is hard to see which service waits for which, and why one fails to start when another is down.
A picture of the dependencies makes the start order and the impact of a failing service obvious.

## Current state

- Nothing visualizes services or their dependencies.
- Containers are grouped by Compose project on the Containers page (`src/components/containers/container-utils.ts`), but services and their `depends_on` relations are never read.

## Scope

- A dependency graph per Compose project, with one node per service and an edge for each `depends_on` relation.
- Color each node by the state of its containers, kept current from the pushed engine state.
- Mark the condition of each edge (`service_started`, `service_healthy`, `service_completed_successfully`).
- Select a node to show its containers and their actions.

## Notes

- `depends_on` is not in container labels, so the graph needs the compose file, which comes with the project view in ORCHESTRATION-001.
- Which containers can reach each other over shared networks is a different graph, tracked in NETWORK-007; the two views could share a graph component.
- No graph or chart library is installed yet.
