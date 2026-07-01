# @cig-technology/cli

[![npm version](https://img.shields.io/npm/v/@cig-technology/cli?logo=npm&label=npm)](https://www.npmjs.com/package/@cig-technology/cli)
[![npm downloads](https://img.shields.io/npm/dm/@cig-technology/cli?logo=npm)](https://www.npmjs.com/package/@cig-technology/cli)
[![Install guide](https://img.shields.io/badge/docs-cig.lat%2Finstall-0ea5e9)](https://cig.lat/install)
[![Dashboard](https://img.shields.io/badge/dashboard-app.cig.lat-7c3aed)](https://app.cig.lat)

Production-oriented CLI for Compute Intelligence Graph.

The CLI is the bootstrapper and operator tool for CIG. It is not the
continuous discovery engine. In the current foundation release, it can:

- launch a first-run `cig setup` wizard for local or managed installs
- validate Node 22, Docker/Compose, memory, disk, and required ports before install
- authenticate against a managed API with device authorization
- install a discovery-first local self-hosted stack with Docker Compose
- stage a managed-mode `cig-node` bundle for later Linux host installation
- seed the initial graph during install and upload it once credentials are available
- store connection profiles, encrypted credentials, install state, and node identity
- report local install status and print the active dashboard URL

During `cig setup` and `cig install`, the CLI asks whether to include the
seeded demo graph/data bundle unless you pass `--demo` explicitly.

## Current State

This package is a real foundation release with the new onboarding flow, but not the final platform shape.

The published npm package is the canonical release artifact. The public
installer at `https://cig.lat/install.sh` resolves `@cig-technology/cli`
from npm first, prints the resolved package version, fetches the matching
`images.json` bundle manifest for that CLI release when it exists, or falls
back to the latest pinned Docker Hub image digests for the same release line
when the asset has not been published yet or cannot be validated. In that case,
Docker Hub becomes the source of truth for the install. It then launches the wizard so the
`curl | bash` path and `npm install -g` path use the same binaries and pinned
container provenance data.

The self-hosted install flow now hands off to the dashboard bootstrap page
inside the protected app shell, where the first administrator account is
created after the API seeds the bootstrap token state.

### Quick links

- Install guide: https://cig.lat/install
- Dashboard: https://app.cig.lat
- Package: https://www.npmjs.com/package/@cig-technology/cli
- GitHub releases: https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/releases

## 📋 Latest Changes (v0.1.30)

### Bug Fixes

* **cli:** add install diagnostics for self-hosted health timeouts and extend the wait window

For full version history, see [CHANGELOG.md](./CHANGELOG.md) and [GitHub releases](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/releases)

## Install

Recommended for most users:

```bash
curl -fsSL https://cig.lat/install.sh | bash
```

That public installer resolves `@cig-technology/cli` from the npm registry
first, then loads the matching Docker Hub bundle manifest for that CLI
version when it exists. If the release asset has not been published yet, the
installer resolves the latest published Docker Hub digests for the bundle so
the web install path and the direct npm path still use pinned container image
digests.

If Docker Engine or Docker Compose is missing, the installer can offer to
install the Docker prerequisites automatically on supported Linux and macOS
package managers before continuing.
If Docker is already installed but the daemon is stopped, the installer can
offer to start or initialize it automatically before retrying the checks.
If Docker is installed but this shell cannot access the daemon or does not
have sudo-capable privileges, the installer explains that you must rerun it
from an administrator shell or a sudo-capable account.

If you prefer a direct npm install:

```bash
npm install -g @cig-technology/cli
```

Or run it directly from the npm registry:

```bash
npx @cig-technology/cli login
```

Or bootstrap from a cloned checkout:

```bash
bash ./install.sh
```

For registry verification and checksum-style checks, inspect the published
package metadata:

```bash
npm view @cig-technology/cli version dist.integrity --json
```

Full installation guide: https://cig.lat/install

## Prerequisites

### Managed mode

- Node.js 22+
- Access to a running CIG API that exposes device authorization and enrollment endpoints

### Self-hosted mode

- Node.js 22+
- Docker Engine
- Docker Compose v2
- at least 4 GB free memory
- at least 10 GB free disk
- free local ports for the stack

You can validate the local host with:

```bash
cig doctor
```

Note: `cig doctor` currently checks local Docker-oriented prerequisites even if
you intend to use managed mode only.

### Technical notes

- `cig setup` is the first-run entrypoint and wraps the same install engine as
  `cig install`.
- The web installer is a thin bash wrapper; it does not embed a separate
  runtime. It resolves the published npm package so the installed bits are
  reproducible.
- The web installer fetches the matching Docker Hub bundle manifest from the
  GitHub release asset named for that CLI version when available. If the
  asset is missing or invalid, it falls back to the latest pinned Docker Hub
  digests for the same bundle so compose files still use pinned image digests
  instead of `latest`, and Docker Hub becomes the source of truth.
- The self-hosted bundle is discovery-first. `core` is kept only as a legacy
  alias for callers that still pass the older profile name.
- When Docker prerequisites are missing, the installer can offer to install
  them automatically on supported Linux and macOS package managers.
- When Docker is installed but not running, the installer can offer to start
  or initialize the daemon before retrying the checks.
- Managed mode stages the runtime bundle and node identity locally until the
  host service path is activated.
- Self-hosted mode writes compose assets into the install directory and boots
  the local stack with Docker Compose.

## Storage Paths

The CLI stores state under XDG config by default:

- `~/.config/cig/credentials.json` — encrypted AWS/GCP connection values
- `~/.config/cig/secrets.json` — encrypted auth tokens, bootstrap token, node identity
- `~/.config/cig/profiles.json` — saved API/control-plane profiles
- `~/.config/cig/state.json` — local installation state
- `~/.cig/install` — generated install assets and staged runtime bundle

The bootstrap token no longer lives in a separate `~/.cig/bootstrap.json` file.
It is stored in the encrypted secrets store.

## Quick Start

### Managed cloud-connected flow

Authenticate:

```bash
cig login --api-url https://app.cig.lat
```

Install a managed profile:

```bash
cig install --mode managed --profile discovery --api-url https://app.cig.lat
```

What this does today:

- authenticates with device flow
- requests enrollment and install manifest data from the API
- generates a node identity locally
- stages runtime assets into `~/.cig/install/node-runtime`
- saves local install state and a managed connection profile

What it does not do yet:

- it does not materialize a host service under `systemd`
- it does not remotely copy or activate the runtime on a Linux VM

### Self-hosted local flow

Install the local stack:

```bash
cig install --mode self-hosted --profile discovery
```

What this does today:

- generates a bootstrap token
- writes compose assets into `~/.cig/install`
- starts the local stack with `docker compose up -d`
- waits for local health endpoints
- stores installation metadata and a self-hosted connection profile
- routes the operator through the dashboard bootstrap flow to finish the first-admin setup

Then print the dashboard URL:

```bash
cig open
```

`cig open` currently prints the resolved dashboard URL. It does not launch a
browser process.

## Commands

### Auth and install

```bash
cig login --api-url http://localhost:8000
cig logout --api-url http://localhost:8000
cig install --mode managed --profile discovery --api-url http://localhost:8000
cig install --mode self-hosted --profile discovery --demo
cig install --mode self-hosted --profile discovery
cig enroll --api-url http://localhost:8000 --profile discovery
cig bootstrap-reset
```

### Connection profiles and provider references

```bash
cig connect aws --role-arn arn:aws:iam::123456789012:role/CIGDiscovery
cig connect gcp --service-account ./service-account.json
cig connect api --url https://app.cig.lat --auth-mode managed
```

Current behavior:

- `connect aws` stores the provided role ARN as an encrypted credential reference
- `connect gcp` stores the provided service-account path as an encrypted credential reference
- `connect api` saves a named API/control-plane profile and can mark it as default
- provider commands do not yet validate cloud permissions or generate IAM/service-account policy

### Status and operations

```bash
cig permissions
cig status
cig status --json
cig open
cig upgrade
cig uninstall
cig uninstall --purge-data
```

Current behavior:

- `permissions` prints the tier model only
- `status` prints saved install state and the default connection profile
- `upgrade` marks the install as stopped and prepares for a future bundle rollout
- `uninstall` removes local install metadata and, in self-hosted mode, attempts `docker compose down`
- `uninstall --purge-data` also removes the install directory

## Local Development

From the monorepo root:

```bash
pnpm --filter @cig-technology/cli lint
pnpm --filter @cig-technology/cli test
pnpm --filter @cig-technology/cli build
```

To smoke-test the packaged CLI:

```bash
cd packages/cli
npm pack --dry-run
node dist/index.js --help
```

Package-local versioning helpers:

```bash
cd packages/cli
npm run version:status
npm run version:validate
npm run version:update-readme
npm run version:bump:patch
npm run version:bump:prerelease
```

## Known Gaps and Caveats

- The CLI package is publishable and usable, but the persistent node runtime is
  still a staged bundle, not a full host-installed service.
- Managed mode depends on compatible API endpoints already existing.
- `doctor` is still biased toward local Docker prerequisites.
- Some lifecycle commands are scaffolding around local state rather than fully
  automated infrastructure workflows.
- Connector, permission approval, and remote install flows are not finished.

## Release

Create a tag in the form `cli-vx.y.z` to trigger the npm publish workflow:

```bash
git tag -a cli-v0.1.2 -m "@cig-technology/cli v0.1.2"
git push origin cli-v0.1.2
```

Or run the local release helper from the monorepo root:

```bash
pnpm cli:release:patch
pnpm cli:release:minor
pnpm cli:release:major
pnpm cli:release:prerelease
```
