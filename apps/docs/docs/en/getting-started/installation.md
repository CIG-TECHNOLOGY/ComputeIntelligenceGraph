---
id: installation
title: Installation
description: Install CIG
sidebar_position: 2
---

# Installation

This guide covers the full installation process for a local development environment.

## Comprehensive Prerequisites

CIG is a modern TypeScript monorepo. Ensure your machine meets these requirements:

- **Operating System**: Linux (Ubuntu 22.04+ recommended), macOS, or Windows (WSL2 recommended).
- **Node.js**: `v22.0` or higher (use `nvm` or `fnm` for management).
- **pnpm**: `v9.0` or higher.
- **Docker**: Engine version `24.0+` with Compose `v2.20+`.
- **Git**: Properly configured with SSH or personal access tokens.

## Detailed Installation Steps

### 1. Repository Access
Clone the repository and enter the director:
```bash
git clone https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph.git
cd ComputeIntelligenceGraph
```

### 2. Dependency Resolution
CIG uses `pnpm` workspaces. Avoid using `npm` or `yarn` as they will ignore the state of the workspace.
```bash
pnpm install
```

### 3. Environment Synchronization
CIG uses a strict environment management system. You cannot run the apps without valid `.env` files in each package/app.
```bash
# Sync all .env files from templates
pnpm env:sync

# Validate your local configuration
pnpm env:doctor
```

### 4. Database Setup
Launch the core persistence and discovery engines (Neo4j, Chroma, API, discovery helpers):
```bash
docker-compose -f docker-compose.dev.yml up -d
```

### 5. Demo or Self-Hosted Install

Use the public installer for a guided setup. In self-hosted mode, the dashboard now hosts the bootstrap flow and the first-admin creation screen directly:

```bash
curl -fsSL https://cig.lat/install.sh | bash
```

Or run the CLI directly:

```bash
cig install
cig install --demo
cig install --mode self-hosted --profile discovery
```

After a self-hosted install, open the dashboard bootstrap page to complete the first administrator setup and inspect the seeded demo data directly in the shell.

### 6. Workspace Build (Optional but Recommended)
For a better initial experience, build all packages once:
```bash
pnpm build:all
```

## Troubleshooting Setup
If you encounter `pnpm install` errors relating to architecture mismatches, ensure you have the correct build tools installed (`build-essential` on Linux). If the graph loads empty in local development, start the demo stack or switch the dashboard graph source to `demo`.
