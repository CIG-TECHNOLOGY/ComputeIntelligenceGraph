---
name: computeintelligencegraph-conventions
description: Development conventions and patterns for ComputeIntelligenceGraph. TypeScript project with conventional commits.
---

# Computeintelligencegraph Conventions

> Generated from [CIG-TECHNOLOGY/ComputeIntelligenceGraph](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph) on 2026-03-18

## Overview

This skill teaches Claude the development patterns and conventions used in ComputeIntelligenceGraph.

## Tech Stack

- **Primary Language**: TypeScript
- **Architecture**: hybrid module organization
- **Test Location**: mixed
- **Test Framework**: playwright

## When to Use This Skill

Activate this skill when:
- Making changes to this repository
- Adding new features following established patterns
- Writing tests that match project conventions
- Creating commits with proper message format

## Commit Conventions

Follow these commit message conventions based on 8 analyzed commits.

### Commit Style: Conventional Commits

### Prefixes Used

- `feat`
- `fix`
- `chore`
- `style`
- `docs`

### Message Guidelines

- Average message length: ~65 characters
- Keep first line concise and descriptive
- Use imperative mood ("Add feature" not "Added feature")


*Commit message example*

```text
fix: resolve remaining type errors in chatbot and api packages
```

*Commit message example*

```text
feat(auth): add @cig/auth package with Supabase OAuth + multi-method sign-in modal
```

*Commit message example*

```text
chore: add MIT license metadata
```

*Commit message example*

```text
docs: reorganize documentation structure
```

*Commit message example*

```text
style: bake 90° CW rotation into CIG icon, regenerate all PNGs + favicon
```

*Commit message example*

```text
fix: resolve lint failures across all workspace packages
```

*Commit message example*

```text
fix: set cig.lat as primary domain and keep legacy fallback
```

*Commit message example*

```text
style(landing): rotate CIG SVG icon 90° clockwise
```

## Architecture

### Project Structure: Turborepo

This project uses **hybrid** module organization.

### Configuration Files

- `.github/workflows/deploy-landing.yml`
- `.github/workflows/publish.yml`
- `.github/workflows/test.yml`
- `apps/dashboard/.eslintrc.json`
- `apps/dashboard/.next/package.json`
- `apps/dashboard/.next/types/package.json`
- `apps/dashboard/next.config.js`
- `apps/dashboard/package.json`
- `apps/dashboard/playwright.config.ts`
- `apps/dashboard/tailwind.config.ts`
- `apps/dashboard/tsconfig.json`
- `apps/landing/.eslintrc.json`
- `apps/landing/next.config.js`
- `apps/landing/package.json`
- `apps/landing/tailwind.config.ts`
- `apps/landing/tsconfig.json`
- `apps/wizard-ui/.eslintrc.json`
- `apps/wizard-ui/next.config.js`
- `apps/wizard-ui/package.json`
- `apps/wizard-ui/tsconfig.json`
- `docker-compose.yml`
- `package.json`
- `packages/agents/package.json`
- `packages/agents/tsconfig.json`
- `packages/api/package.json`
- `packages/api/tsconfig.json`
- `packages/auth/package.json`
- `packages/auth/tsconfig.json`
- `packages/chatbot/node_modules/.ignored/fast-check/lib/esm/package.json`
- `packages/chatbot/node_modules/.ignored/fast-check/package.json`
- `packages/chatbot/node_modules/pure-rand/lib/esm/package.json`
- `packages/chatbot/node_modules/pure-rand/package.json`
- `packages/chatbot/package.json`
- `packages/chatbot/tsconfig.json`
- `packages/cli/node_modules/.ignored/fast-check/lib/esm/package.json`
- `packages/cli/node_modules/.ignored/fast-check/package.json`
- `packages/cli/node_modules/pure-rand/lib/esm/package.json`
- `packages/cli/node_modules/pure-rand/package.json`
- `packages/cli/package.json`
- `packages/cli/tsconfig.json`
- `packages/config/node_modules/.ignored/fast-check/lib/esm/package.json`
- `packages/config/node_modules/.ignored/fast-check/package.json`
- `packages/config/node_modules/pure-rand/lib/esm/package.json`
- `packages/config/node_modules/pure-rand/package.json`
- `packages/config/package.json`
- `packages/config/tsconfig.json`
- `packages/discovery/package.json`
- `packages/discovery/tsconfig.json`
- `packages/graph/package.json`
- `packages/graph/tsconfig.json`
- `packages/iac/package.json`
- `packages/sdk/package.json`
- `packages/sdk/tsconfig.json`
- `services/cartography/Dockerfile`

### Guidelines

- This project uses a hybrid organization
- Follow existing patterns when adding new code

## Code Style

### Language: TypeScript

### Naming Conventions

| Element | Convention |
|---------|------------|
| Files | PascalCase |
| Functions | camelCase |
| Classes | PascalCase |
| Constants | SCREAMING_SNAKE_CASE |

### Import Style: Relative Imports

### Export Style: Mixed Style


*Preferred import style*

```typescript
// Use relative imports
import { Button } from '../components/Button'
import { useAuth } from './hooks/useAuth'
```

## Testing

### Test Framework: playwright

### File Pattern: `*.test.ts`

### Test Types

- **Unit tests**: Test individual functions and components in isolation
- **Integration tests**: Test interactions between multiple components/services
- **E2e tests**: Test complete user flows through the application

### Mocking: vi.mock


## Error Handling

### Error Handling Style: Try-Catch Blocks


*Standard error handling pattern*

```typescript
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  console.error('Operation failed:', error)
  throw new Error('User-friendly message')
}
```

## Common Workflows

These workflows were detected from analyzing commit patterns.

### Feature Development

Standard feature implementation workflow

**Frequency**: ~22 times per month

**Steps**:
1. Add feature implementation
2. Add tests for feature
3. Update documentation

**Files typically involved**:
- `apps/dashboard/.next/types/app/graph/*`
- `apps/dashboard/.next/types/app/*`
- `apps/dashboard/.next/types/app/resources/*`
- `**/*.test.*`
- `**/api/**`

**Example commit sequence**:
```
feat: upgrade to @edcalderon/versioning v1.4.7 with workspace-scripts
chore: configure GitHub Pages deployment for landing page
fix: update pnpm version to 9 in deploy-landing workflow
```

### Add Or Update App Feature

Implements or updates a feature in an app (e.g., landing, dashboard, wizard-ui), often involving UI components, configuration, and sometimes assets.

**Frequency**: ~4 times per month

**Steps**:
1. Edit or create files in apps/{app}/app/ (e.g., page.tsx, layout.tsx)
2. Optionally add or update files in apps/{app}/components/
3. Optionally update apps/{app}/public/ assets (e.g., icons, favicons, manifest PNGs)
4. Optionally update apps/{app}/next.config.js or package.json if config or dependencies change

**Files typically involved**:
- `apps/{app}/app/page.tsx`
- `apps/{app}/app/layout.tsx`
- `apps/{app}/components/*.tsx`
- `apps/{app}/public/*`
- `apps/{app}/next.config.js`
- `apps/{app}/package.json`

**Example commit sequence**:
```
Edit or create files in apps/{app}/app/ (e.g., page.tsx, layout.tsx)
Optionally add or update files in apps/{app}/components/
Optionally update apps/{app}/public/ assets (e.g., icons, favicons, manifest PNGs)
Optionally update apps/{app}/next.config.js or package.json if config or dependencies change
```

### Add Or Update Auth Or Api Package

Creates a new package or updates an existing one, including implementation, configuration, and integration into an app.

**Frequency**: ~2 times per month

**Steps**:
1. Create or edit packages/{package}/src/* (implementation files)
2. Add or update packages/{package}/package.json and tsconfig.json
3. Edit apps/{app}/app/* and/or components to integrate the package
4. Update pnpm-lock.yaml to reflect dependency changes
5. Optionally update .env.example or config files in the app

**Files typically involved**:
- `packages/{package}/src/*`
- `packages/{package}/package.json`
- `packages/{package}/tsconfig.json`
- `apps/{app}/app/*`
- `apps/{app}/components/*`
- `apps/{app}/.env.example`
- `pnpm-lock.yaml`

**Example commit sequence**:
```
Create or edit packages/{package}/src/* (implementation files)
Add or update packages/{package}/package.json and tsconfig.json
Edit apps/{app}/app/* and/or components to integrate the package
Update pnpm-lock.yaml to reflect dependency changes
Optionally update .env.example or config files in the app
```

### Linting And Type Fix Sweep

Performs a sweep across multiple packages/apps to fix lint or type errors, update lint configs, and synchronize tsconfig/package.json settings.

**Frequency**: ~2 times per month

**Steps**:
1. Edit package.json scripts for linting in multiple packages/apps
2. Add or update .eslintrc.json in relevant apps/packages
3. Edit tsconfig.json to exclude or include files as needed
4. Update dependencies (e.g., eslint, @types/*) in package.json
5. Update pnpm-lock.yaml to reflect dependency changes

**Files typically involved**:
- `packages/*/package.json`
- `apps/*/package.json`
- `packages/*/tsconfig.json`
- `apps/*/tsconfig.json`
- `apps/*/.eslintrc.json`
- `pnpm-lock.yaml`

**Example commit sequence**:
```
Edit package.json scripts for linting in multiple packages/apps
Add or update .eslintrc.json in relevant apps/packages
Edit tsconfig.json to exclude or include files as needed
Update dependencies (e.g., eslint, @types/*) in package.json
Update pnpm-lock.yaml to reflect dependency changes
```

### Docs Restructure Or Update

Reorganizes or updates documentation, including moving files, updating readmes, and adding new docs sections.

**Frequency**: ~2 times per month

**Steps**:
1. Edit or move files in docs/ (including subfolders like architecture, reference, testing)
2. Update README.md at root or in docs/
3. Optionally add or update LICENSE or package.json metadata

**Files typically involved**:
- `docs/**/*`
- `README.md`
- `LICENSE`
- `package.json`

**Example commit sequence**:
```
Edit or move files in docs/ (including subfolders like architecture, reference, testing)
Update README.md at root or in docs/
Optionally add or update LICENSE or package.json metadata
```

### Ci Cd Or Github Actions Workflow Update

Adds or updates CI/CD workflows, especially for deployment or testing, and synchronizes related app configs.

**Frequency**: ~2 times per month

**Steps**:
1. Edit or add files in .github/workflows/
2. Edit apps/{app}/next.config.js or related deployment config
3. Optionally update .gitignore to exclude build artifacts

**Files typically involved**:
- `.github/workflows/*.yml`
- `apps/{app}/next.config.js`
- `.gitignore`

**Example commit sequence**:
```
Edit or add files in .github/workflows/
Edit apps/{app}/next.config.js or related deployment config
Optionally update .gitignore to exclude build artifacts
```


## Best Practices

Based on analysis of the codebase, follow these practices:

### Do

- Use conventional commit format (feat:, fix:, etc.)
- Write tests using playwright
- Follow *.test.ts naming pattern
- Use PascalCase for file names
- Prefer mixed exports

### Don't

- Don't write vague commit messages
- Don't skip tests for new features
- Don't deviate from established patterns without discussion

---

*This skill was auto-generated by [ECC Tools](https://ecc.tools). Review and customize as needed for your team.*
