# CLAUDE.md — CIG project conventions for Claude Code

## Git remotes — origin is canonical

This repo may have a legacy `upstream` remote for reference, but production
changes and releases are pushed only to the canonical organization repository.

| Remote | URL | Role |
|--------|-----|------|
| `origin` | `https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph` | Canonical org repo |
| `upstream` | legacy/reference remote only | Historical upstream; never a production target |

After every commit (including release bumps) push to `origin`:

```bash
git push origin main
```

For tags, push only the new tag:

```bash
git push origin v1.0.1
```

Treat `origin` as the only production push target; keep `upstream` read-only.

## Release process — always use the script

**Never** manually edit `package.json` version, `CHANGELOG.md`, or `README.md` version references, and **never** manually run `git tag` or `git push` for a release. The release script does all of this atomically and correctly.

```bash
pnpm release:patch   # bug fixes and docs only
pnpm release:minor   # new features
pnpm release:major   # breaking changes or significant milestones
pnpm release:dry     # preview without writing anything
```

The script (`scripts/release.sh`) handles in order:
1. Branch state and working tree checks
2. `pnpm install --frozen-lockfile`
3. Full test suite
4. Production builds (landing, dashboard container, wizard-ui)
5. Version bump via `@edcalderon/versioning` across all packages
6. CHANGELOG.md generation from conventional commits
7. README.md badge + Latest Changes update
8. `git commit` + `git tag`
9. `git push` to the canonical `origin` repository only

**Hard rules — enforced by this file:**
- Do not push releases to the legacy upstream remote
- Do not create a release commit by hand; `chore(release): vX.Y.Z` commits come only from the script
- Do not edit `package.json` version manually; that is the script's job
- `--no-build` and `--no-tests` flags exist for CI emergencies only, not routine use

Patch = bug fixes and docs only. Minor = new features. Major = breaking changes or significant milestones.

## Docker builds

All container build definitions live in `packages/infra/docker/`. Docker context is always the monorepo root.

```bash
docker build -f packages/infra/docker/Dockerfile.api -t cig-api:local .
docker build -f packages/infra/docker/Dockerfile.dashboard -t cig-dashboard:local .
```

## Secret management — Infisical first

**Mandate (2026-07-03):** Use the CIG self-hosted Infisical instance at `secrets.cig.technology` for all new internal secrets. Do **not** create new AWS Secrets Manager secrets unless acting as a single bootstrap vehicle (e.g. storing one Infisical service token so an EC2 can authenticate on first boot).

Specifically:
- Any new Terraform module or script that would add an `aws_secretsmanager_secret` resource must instead pull from Infisical.
- AWS Secrets Manager already holds legacy secrets for Authentik and monitor bootstrap — those stay until the [infisical-secrets-manager task](.agents/active/infisical-secrets-manager/task.md) migrates them.
- When writing bootstrap scripts for new EC2s: store **one** Infisical service token in Secrets Manager, then use `infisical run --env=production -- <command>` to inject all other secrets at runtime.

## AWS account guard

Production resources live in AWS account `520900722378` (region `us-east-2`). Scripts that mutate production Authentik or Secrets Manager must verify `aws sts get-caller-identity` resolves to that account before proceeding.

## Conventional commits

Use the conventional commit format: `type(scope): message`. Common types: `feat`, `fix`, `chore`, `docs`, `refactor`. Scope is optional but encouraged for packages (e.g. `fix(auth):`, `chore(infra):`).
