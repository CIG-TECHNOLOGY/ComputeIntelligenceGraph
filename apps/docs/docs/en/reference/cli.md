---
id: cli
title: CLI Reference
description: Current @cig-technology/cli behavior and release surface
sidebar_position: 1
---

# CLI Reference

This page describes the current `@cig-technology/cli` foundation release as it exists in the repository today.

## Purpose

The CLI is the bootstrap and operator surface for CIG. It is responsible for:

- authenticating the operator
- staging installs
- generating or requesting bootstrap material
- storing local session and install metadata
- reporting local status

It is not the persistent graph-maintenance process. That responsibility is intended to move into `cig-node`.

## Install and Run

Install from npm:

```bash
npm install -g @cig-technology/cli
```

Or run with `npx`:

```bash
npx @cig-technology/cli login --api-url https://api.cig.technology
```

For first-time onboarding, use the interactive setup wizard:

```bash
cig setup
```

Or run the public bash installer:

```bash
curl -fsSL https://cig.lat/install.sh | bash
```

## Current Install Modes

### Managed mode

- device authorization login
- enrollment request against the API
- local node key generation
- managed connection-profile storage
- staging of runtime bundle assets into the local install directory
- initial graph snapshot capture during install, with upload when auth is available

### Self-hosted mode

- bootstrap token generation
- compose manifest generation
- local `docker compose up -d`
- health polling against the local stack
- local install-state persistence
- initial graph snapshot capture during install, with queued upload once local auth exists

### Demo mode

- demo install prompts can seed the shared demo workspace
- the dashboard can switch to `demo` graph mode without live discovery

## Package Maintenance

The CLI package has package-local versioning integration for maintainers:

```bash
cd packages/cli
npm run version:status
npm run version:validate
npm run version:update-readme
npm run version:bump:patch
```

`scripts/release.sh` wraps this flow and keeps the public tag format as `cli-vx.y.z`.

## Local Files and State

Default locations:

- `~/.config/cig/credentials.json`
- `~/.config/cig/secrets.json`
- `~/.config/cig/profiles.json`
- `~/.config/cig/state.json`
- `~/.cig/install`

## Related Docs

- [CLI runtime state](../architecture/cli-current-state.md)
- [Installation guide](../getting-started/installation.md)
- [Project status](../project-status.md)
