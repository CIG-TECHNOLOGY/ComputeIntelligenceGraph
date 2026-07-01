# Versioning v1.4.7 Upgrade Summary

**Date:** March 16, 2026  
**Upgrade:** @edcalderon/versioning 1.4.6 → 1.4.7

---

## ✨ What's New in v1.4.7

### Workspace Scripts Extension (v1.0.0)

The major new feature in v1.4.7 is the **workspace-scripts extension** that automatically generates development and build scripts for all workspace apps.

#### Key Features

1. **Auto-Generated Scripts**
   - Individual scripts for each app (dev:dashboard, build:api, etc.)
   - Aggregate scripts (dev:all, build:all)
   - Parallel execution using concurrently

2. **Smart Management**
   - Tracks managed scripts to prevent conflicts
   - Safe updates without overwriting custom scripts
   - Auto-detects new apps via postSync hook

3. **Commands**
   - `versioning scripts sync` - Regenerate scripts
   - `versioning scripts list` - Show configuration
   - `versioning scripts detect` - Find new apps
   - `versioning scripts preview` - Preview without writing

---

## 📦 What Was Installed

### New Dependencies
- `@edcalderon/versioning@1.4.7` (upgraded from 1.4.6)
- `concurrently@9.2.1` (new - for parallel script execution)

### Configuration Files
- Updated `versioning.config.json` with workspace-scripts config
- Updated `package.json` with 25 auto-generated scripts

---

## 🎯 Generated Scripts

### Development Scripts (11 apps)
```bash
pnpm dev:dashboard    # Dashboard dev server
pnpm dev:landing      # Landing page dev server
pnpm dev:wizard-ui    # Wizard UI dev server
pnpm dev:api          # API dev server
pnpm dev:agents       # Agents watch mode
pnpm dev:chatbot      # Chatbot watch mode
pnpm dev:cli          # CLI watch mode
pnpm dev:config       # Config watch mode
pnpm dev:discovery    # Discovery watch mode
pnpm dev:graph        # Graph watch mode
pnpm dev:sdk          # SDK watch mode

# Run ALL apps simultaneously
pnpm dev:all
```

### Build Scripts (11 packages)
```bash
pnpm build:dashboard
pnpm build:landing
pnpm build:wizard-ui
pnpm build:api
pnpm build:agents
pnpm build:chatbot
pnpm build:cli
pnpm build:config
pnpm build:discovery
pnpm build:graph
pnpm build:sdk

# Build everything
pnpm build:all
```

---

## 🔧 Configuration

### versioning.config.json

Added workspace-scripts extension configuration:

```json
{
  "extensions": ["workspace-scripts"],
  "extensionConfig": {
    "workspace-scripts": {
      "enabled": true,
      "runner": "concurrently",
      "apps": {
        "apps/dashboard": { "name": "dashboard", "scripts": ["dev", "build", "test", "lint"] },
        "apps/landing": { "name": "landing", "scripts": ["dev", "build"] },
        "apps/wizard-ui": { "name": "wizard", "scripts": ["dev", "build"] },
        "packages/api": { "name": "api", "scripts": ["dev", "build", "test", "start"] },
        "packages/agents": { "name": "agents", "scripts": ["dev", "build", "test"] },
        "packages/chatbot": { "name": "chatbot", "scripts": ["dev", "build", "test"] },
        "packages/cli": { "name": "cli", "scripts": ["dev", "build", "test"] },
        "packages/config": { "name": "config", "scripts": ["dev", "build", "test"] },
        "packages/discovery": { "name": "discovery", "scripts": ["dev", "build", "test"] },
        "packages/graph": { "name": "graph", "scripts": ["dev", "build", "test"] },
        "packages/sdk": { "name": "sdk", "scripts": ["dev", "build", "test"] }
      },
      "autoDetect": true,
      "postSyncHook": true
    }
  }
}
```

---

## 🚀 Usage Examples

### Full-Stack Development

```bash
# Start everything (dashboard, API, all packages in watch mode)
pnpm dev:all

# This runs 11 processes concurrently:
# - Dashboard dev server (Next.js)
# - Landing page dev server
# - Wizard UI dev server
# - API dev server (Fastify)
# - All packages in TypeScript watch mode
```

### Selective Development

```bash
# Just work on the dashboard
pnpm dev:dashboard

# Work on API and related packages
pnpm dev:api & pnpm dev:graph & pnpm dev:discovery
```

### Production Build

```bash
# Build everything in correct dependency order
pnpm build:all

# Build specific components
pnpm build:api
pnpm build:dashboard
```

---

## 📊 Impact

### Before v1.4.7
- Manual script management
- No aggregate dev/build commands
- Had to use turbo for everything
- 13 scripts in package.json

### After v1.4.7
- Auto-generated workspace scripts
- dev:all and build:all commands
- Per-app granular control
- 38 scripts in package.json (25 auto-generated)
- Managed script tracking

---

## ✅ Benefits

1. **Developer Experience**
   - One command to start everything: `pnpm dev:all`
   - Granular control over individual apps
   - Parallel execution for faster builds

2. **Maintainability**
   - Scripts auto-update when apps are added/removed
   - No manual script management
   - Consistent naming conventions

3. **Flexibility**
   - Choose to run all apps or specific ones
   - Easy to add new apps (auto-detected)
   - Custom scripts remain untouched

4. **Safety**
   - Tracks managed scripts
   - Won't overwrite custom scripts
   - Clean removal of obsolete scripts

---

## 🔄 Auto-Detection

The postSync hook automatically detects new apps when you:
- Run `pnpm version:sync`
- Run `versioning scripts sync`
- Add a new package to `pnpm-workspace.yaml`

New apps are detected and can be added to the config with:
```bash
npx versioning scripts detect
```

---

## 📝 Next Steps

1. **Try the new commands:**
   ```bash
   pnpm dev:all        # Start everything
   pnpm build:all      # Build everything
   ```

2. **Check the configuration:**
   ```bash
   npx versioning scripts list
   ```

3. **Add new apps easily:**
   - Create the app
   - Run `npx versioning scripts detect`
   - Update config and sync

4. **Read the guide:**
   - See `VERSIONING_GUIDE.md` for full documentation

---

## 🎉 Summary

The upgrade to v1.4.7 brings powerful workspace script management that:
- ✅ Auto-generates 25 development and build scripts
- ✅ Provides `dev:all` and `build:all` aggregate commands
- ✅ Uses concurrently for parallel execution
- ✅ Auto-detects new apps
- ✅ Safely manages scripts without conflicts

This significantly improves the developer experience and makes it easier to work with the CIG monorepo!

---

**Upgrade completed successfully!** 🚀
