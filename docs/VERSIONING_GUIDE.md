# CIG Versioning Guide

## Overview

This project uses [@edcalderon/versioning](https://www.npmjs.com/package/@edcalderon/versioning) v1.4.7 to manage versions across the monorepo, prevent private package leaks, provide cleanup utilities, and auto-generate workspace scripts.

## 🆕 New in v1.4.7: Workspace Scripts Extension

The workspace-scripts extension automatically generates dev:all, build:all, and per-app scripts in the root package.json.

### Auto-Generated Scripts

#### Development Scripts
```bash
# Run individual apps in dev mode
pnpm dev:dashboard    # Start dashboard dev server
pnpm dev:landing      # Start landing page dev server
pnpm dev:api          # Start API dev server
pnpm dev:agents       # Start agents in watch mode
# ... and 7 more dev:* scripts

# Run ALL apps in dev mode concurrently
pnpm dev:all          # Starts all 11 apps simultaneously
```

#### Build Scripts
```bash
# Build individual apps
pnpm build:dashboard  # Build dashboard
pnpm build:api        # Build API
pnpm build:agents     # Build agents
# ... and 8 more build:* scripts

# Build ALL packages
pnpm build:all        # Builds all packages recursively
```

### Workspace Scripts Management

```bash
# Sync workspace scripts (regenerate from config)
npx versioning scripts sync

# List current configuration
npx versioning scripts list

# Detect new apps not yet configured
npx versioning scripts detect

# Preview scripts without writing
npx versioning scripts preview
```

## Version Management Commands

```bash
# Check version status
pnpm version:status

# Validate all versions are in sync
pnpm version:validate

# Sync versions across all packages
pnpm version:sync

# Bump versions
pnpm version:bump:patch    # 0.1.0 → 0.1.1
pnpm version:bump:minor    # 0.1.0 → 0.2.0
pnpm version:bump:major    # 0.1.0 → 1.0.0

# Generate changelog
pnpm version:changelog

# Check for secrets in code
pnpm check:secrets

# Clean build artifacts
pnpm clean
```

## Features Enabled

### ✅ Version Synchronization
All packages and apps maintain the same version (0.1.0)

### ✅ Workspace Scripts (NEW in v1.4.7)
- Auto-generates dev:* and build:* scripts for each app
- Creates dev:all and build:all aggregate scripts
- Uses concurrently for parallel execution
- Tracks managed scripts to prevent conflicts
- Auto-detects new apps via postSync hook

### ✅ Private Package Protection
Prevents accidental publishing of private packages

### ✅ Dependency Sync
Workspace dependencies stay in sync

### ✅ Cleanup Utilities
Removes node_modules, dist, .next, coverage, logs

### ✅ Branch Awareness
Different versioning strategies for main/develop branches

## Configuration

See `versioning.config.json` for full configuration.

### Workspace Scripts Config

```json
{
  "extensionConfig": {
    "workspace-scripts": {
      "enabled": true,
      "runner": "concurrently",
      "apps": {
        "apps/dashboard": { "name": "dashboard", "scripts": ["dev", "build"] },
        "packages/api": { "name": "api", "scripts": ["dev", "build", "start"] }
      },
      "autoDetect": true,
      "postSyncHook": true
    }
  }
}
```

## Workflow Examples

### Starting Development

```bash
# Start just the dashboard
pnpm dev:dashboard

# Start API and dashboard together
pnpm dev:api & pnpm dev:dashboard

# Start EVERYTHING (all 11 apps)
pnpm dev:all
```

### Building for Production

```bash
# Build everything
pnpm build:all

# Build specific packages
pnpm build:api
pnpm build:dashboard
```

### Adding a New App

1. Create the app in `apps/` or `packages/`
2. Run `npx versioning scripts detect` to see it
3. Add it to `versioning.config.json` under `extensionConfig.workspace-scripts.apps`
4. Run `npx versioning scripts sync` to generate scripts

Or let the postSync hook auto-detect it on next version sync!

## Managed Scripts

The extension tracks which scripts it manages via the `__workspace_scripts_managed` field in package.json. This ensures:
- Safe updates without conflicts
- Clean removal of obsolete scripts
- No interference with custom scripts

## Tips

- Use `dev:all` for full-stack development
- Use individual `dev:*` scripts when working on specific components
- The `build:all` script respects dependency order
- Scripts are regenerated on `versioning sync` if config changes
