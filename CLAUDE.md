# CLAUDE.md — CIG project conventions for Claude Code

## Git remotes — always push to both

This repo has two remotes. **Both must stay in sync on every push.**

| Remote | URL | Role |
|--------|-----|------|
| `origin` | `https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph` | Canonical org repo |
| `upstream` | `https://github.com/edwardcalderon/ComputeIntelligenceGraph` | Personal mirror / upstream |

After every commit (including release bumps) push to **both**:

```bash
git push origin main
git push upstream main
```

For tags, push only the new tag (the pre-push hook rejects old mismatched tags on a fresh remote):

```bash
git push origin v1.0.1
git push upstream v1.0.1
```

Never push only to one remote and call the work done.

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
9. `git push` to **both** `origin` and `upstream`

**Hard rules — enforced by this file:**
- Do not run `git push origin main` alone; the script always pushes both remotes
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

## AWS account guard

Production resources live in AWS account `520900722378` (region `us-east-2`). Scripts that mutate production Authentik or Secrets Manager must verify `aws sts get-caller-identity` resolves to that account before proceeding.

## Conventional commits

Use the conventional commit format: `type(scope): message`. Common types: `feat`, `fix`, `chore`, `docs`, `refactor`. Scope is optional but encouraged for packages (e.g. `fix(auth):`, `chore(infra):`).
