---
id: project-status
title: Project Status
description: Release-aware snapshot of the current CIG repository state
sidebar_position: 1
---

# Project Status

This page mirrors the current repository snapshot so the Docusaurus site stays aligned with the root README and `PROJECT_STATUS.md`.

## Current Release

- Version: `1.0.6`
- Latest released tag: `v1.0.6`
- Status: active development

## Current Product Surface

- `apps/landing` is the public entrypoint and authentication handoff surface at `https://cig.lat`
- `apps/dashboard` is the protected application at `https://app.cig.lat` with live/demo graph source switching, 2D/3D graph visualization, chat workflows, and the self-hosted bootstrap shell that shows demo data directly during first-run setup
- `packages/api` is the canonical Fastify API for REST, GraphQL, WebSocket, chat, graph snapshots, semantic retrieval, auth bridges, and bootstrap completion endpoints
- `packages/cli` is the operator and install surface, including interactive demo-data provisioning, self-hosted bootstrap token generation, and dashboard handoff for new installs
- `packages/discovery`, `services/cartography`, `packages/graph`, `packages/chatbot`, and `packages/agents` power discovery, graph indexing, retrieval, and refinement workflows

## Operating Modes

- `live` uses real discovery-backed infrastructure for managed or self-hosted environments
- `demo` uses the shared seeded demo workspace for managed demo accounts and local development when live discovery is unavailable

## What Is Implemented

- dashboard resources, graph source switching, 2D/3D graph visualization, costs, security, auth, chat, and the self-hosted bootstrap shell
- Fastify API routes for resources, graph snapshots, graph refinement, chat, discovery, costs, security, actions, sessions, newsletter, node management, and bootstrap completion
- Neo4j graph engine and Chroma-backed semantic retrieval
- CLI login, install, bootstrap, enrollment, connect, demo provisioning, dashboard handoff, and local state management
- discovery orchestration plus Python Cartography ingestion
- authentication helpers and shared auth/session utilities

## What Is Still Evolving

- `apps/wizard-ui` is still a placeholder surface
- `packages/sdk` is the shared client foundation, but it is not yet feature-complete across the full CIG domain
- API production infrastructure still needs first live deployment validation on AWS

## Related Docs

- [Getting Started](./getting-started/index.md)
- [Architecture](./architecture/index.md)
- [Deployment Notes](./deployment/README.md)
- [Authentication](./authentication/README.md)
