# Spec: `@edcalderon/versioning` Workspace Env Extension

## Summary

This document specifies a reusable `@edcalderon/versioning` extension for workspace env management in monorepos with multiple apps and runtime packages.

The goal is to support one canonical root env source, generate minimal per-target env files automatically, and keep examples, validation, and release behavior consistent across repositories.

This spec is based on the working implementation in this repository.

Related issue:

- https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues/9

## Problem Statement

Monorepos commonly have three conflicting env models at the same time:

- frontend frameworks require local app-level `.env*` files
- backend services read ambient `process.env`
- shared libraries document env usage but do not own an execution environment

That leads to:

- duplicated variables across apps and packages
- drift between real runtime requirements and `.env.example` files
- inconsistent naming between projects
- hard-to-reuse conventions across repositories
- release/build flows that forget to refresh generated env artifacts

## Goals

- Define one canonical env contract for the workspace.
- Treat the root `.env` and `.env.local` as canonical local input sources.
- Generate only the env files required by executable targets.
- Support source-to-target key mapping such as `SUPABASE_URL` -> `NEXT_PUBLIC_SUPABASE_URL`.
- Support aliases for legacy or inconsistent key names.
- Generate root and per-target example files from the same manifest.
- Provide a doctor/validation command that reports missing required keys by target.
- Allow integration into `dev`, `build`, and `release` workflows.
- Keep the extension optional and independent from core version bump logic.

## Non-Goals

- secret storage or secret rotation
- cloud secret manager integration in the first version
- production secret injection for deployment platforms
- replacing framework-native env loading
- forcing every library package to own a physical `.env` file

## Core Concept

The extension manages env at the level of runtime targets, not arbitrary packages.

A runtime target is anything that executes as an app, service, worker, CLI, or deployable unit. Libraries may declare env dependencies indirectly, but generated env files belong to the runtime target that executes them.

Examples from this repo:

- `landing`
- `dashboard`
- `api`
- `agents`
- `chatbot`
- `discovery`
- `graph`
- `infra`

## Extension Name

Recommended extension identifier:

- `workspace-env`

## Manifest Contract

### Default Path

The extension should look for one of:

- `config/env/manifest.ts`
- `config/env/manifest.js`
- `config/env/manifest.cjs`
- `config/env/manifest.json`

### Manifest Shape

```ts
type EnvVariable = {
  key: string;
  aliases?: string[];
  description?: string;
  example?: string;
  secret?: boolean;
};

type TargetEntry = {
  source: string;
  target?: string;
  required?: boolean;
};

type EnvTarget = {
  id: string;
  description?: string;
  outputFile: string;
  exampleFile: string;
  entries: TargetEntry[];
};

type WorkspaceEnvManifest = {
  rootExampleFile?: string;
  variables: EnvVariable[];
  targets: EnvTarget[];
};
```

### Required Behavior

- `variables` define the canonical source of truth for workspace env keys.
- `aliases` allow backward compatibility for old or inconsistent root key names.
- `targets` define the executable surfaces that need generated env files.
- `entries.source` references a canonical variable key.
- `entries.target` optionally renames the key for the generated target file.
- `entries.required` controls doctor/validation behavior for that target.

## Root Env Source Rules

### Default Inputs

The extension should read, in order:

1. `.env`
2. `.env.local`

Later files override earlier ones.

### Canonical Resolution

For each canonical key:

1. If the exact canonical key exists in root input, use it.
2. Otherwise, if one of its aliases exists, use that value.
3. Otherwise, consider the key unresolved.

### Unknown Key Handling

Doctor/validation should report root keys that are not part of the manifest and are not known aliases.

## Generated Outputs

### Required Output Types

The extension must generate:

- one root example file, default `.env.example`
- one generated `.env.local` file per target
- one generated example file per target

### Generation Rules

- Create parent directories if needed.
- Only write files when content changes.
- Preserve deterministic ordering.
- Include a generated header comment.
- Omit unresolved optional keys from generated runtime files.
- Do not synthesize values for unresolved required keys.
- Example files should always include the full declared surface for the target.

### Recommended Runtime File Behavior

Generated runtime env files should be safe to ignore in git and should contain only resolved values from the root source.

### Recommended Example File Behavior

Generated example files should be tracked in git and act as stable documentation for the target contract.

## CLI Surface

### `versioning env sync`

Generates root and target env artifacts from canonical root sources.

Supported options:

- `--target <id>` or repeated `--target`
- `--check` to fail if files would change
- `--json` optional machine-readable summary

Expected behavior:

- load manifest
- load root env sources
- generate outputs
- print touched and changed files

### `versioning env doctor`

Prints a human-readable readiness report.

Expected behavior:

- report root env sources in use
- report missing required keys by target
- report unknown or unused root keys
- report ready targets explicitly

### `versioning env validate`

Validation-oriented command for CI and hooks.

Supported options:

- `--target <id>`
- `--all`
- `--strict-unused`
- `--json`

Expected behavior:

- exit non-zero if a selected target is missing required keys
- optionally fail on unused root keys in strict mode

### Optional Future Commands

- `versioning env init`
- `versioning env print --target landing`
- `versioning env docs`

## Hook Integration

The extension should be hookable but not mandatory.

### Recommended Hooks

- before workspace `dev`
- before workspace `build`
- before workspace `release`

### Behavior

- `env sync` should be callable explicitly
- hook execution should be opt-in through extension config
- release flows should be able to stage generated tracked example files while leaving ignored generated runtime files untracked

## Script Automation

The extension should optionally register or manage workspace scripts such as:

- `env:sync`
- `env:doctor`
- `env:validate`

It should also support integration into existing managed scripts when the consuming repo wants that behavior.

## Caching / Monorepo Integration

The extension should expose or document recommended cache inputs for tools like Turborepo.

At minimum, changes to these should invalidate relevant work:

- root `.env`
- root `.env.local`
- env manifest files
- generated target `.env.local` files when they are used as build inputs

## Acceptance Criteria

The extension should be considered complete for this use case if it supports all of the following.

### Canonical Root Contract

- A repo can define canonical keys once in a manifest.
- A repo can alias legacy keys without breaking existing local setup.
- Root `.env` and `.env.local` act as the canonical local source.

### Target-Specific Generation

- A repo can generate `apps/landing/.env.local` from canonical root values.
- A repo can map `SUPABASE_URL` -> `NEXT_PUBLIC_SUPABASE_URL`.
- A repo can generate `apps/dashboard/.env.local` from `NEXT_PUBLIC_API_URL`.
- A repo can generate backend target files such as `packages/api/.env.local` and `packages/graph/.env.local`.

### Minimal Surface Per Target

- Each target file contains only the variables declared for that target.
- Shared secrets are not copied into targets that do not need them.

### Examples and Documentation

- A repo can generate `.env.example` from the manifest.
- A repo can generate target-specific example files from the same manifest.
- Example files stay aligned with the real target contract.

### Validation

- Doctor reports which targets are ready.
- Doctor reports exactly which required keys are missing per target.
- Validation can fail CI if selected targets are incomplete.
- Doctor can report unused root keys.

### Workflow Integration

- `env sync` can be run before `dev`.
- `env sync` can be run before `build`.
- `env sync` can be run before `release`.
- Generated env artifacts are refreshed before release commits are created.

### Idempotence

- Re-running sync without source changes produces no file diffs.
- Generated files are deterministic.

## Reference Use Case from This Repo

This repository currently uses the following model successfully:

- manifest at `config/env/manifest.cjs`
- official commands via `versioning env sync`, `versioning env doctor`, and `versioning env validate`
- root script wiring in `package.json`
- release integration in `scripts/release.sh`
- cache integration in `turbo.json`

Representative mappings:

- `SUPABASE_URL` -> `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_ANON_KEY` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` -> dashboard target
- `JWT_SECRET` -> api target
- `OPENAI_API_KEY` -> agents/chatbot targets
- `NEO4J_*` -> graph/api targets
- infra-specific deployment keys -> infra target

## Suggested Initial Delivery Scope

Phase 1 should include:

- manifest loading
- `env sync`
- `env doctor`
- `env validate`
- root + target example generation
- target mapping and alias resolution
- script/hook integration points

Phase 2 can add:

- docs generation from manifest metadata
- multiple environment modes
- more advanced CI policies
- integration helpers for Turborepo / Nx / GitHub Actions

## Open Design Questions

- Should the extension own script generation directly or only expose commands?
- Should the manifest allow target inheritance?
- Should `env validate` fail on unresolved optional mappings with explicit policy flags?
- Should the extension support multiple root source sets such as `.env.production` by mode?

## Maintainer Review Checklist

- Does this fit the extension boundary of `@edcalderon/versioning`?
- Is the manifest format small enough to be stable across projects?
- Are `sync`, `doctor`, and `validate` the right minimum command set?
- Is target-level env ownership the right abstraction instead of package-level ownership?
- Is hook integration preferable to hard-coded script rewriting?
