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

## Release process

1. Stage all relevant changes (exclude `node_modules`, `dist`, `.next`, `.turbo`, `tfstate`, `tsbuildinfo`).
2. Prepend a new block to `CHANGELOG.md` and update `README.md` badge + Latest Changes block.
3. Bump `package.json` version field.
4. Commit with `chore(release): vX.Y.Z`.
5. Tag `vX.Y.Z`.
6. Push branch and tag to **both** remotes.

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
