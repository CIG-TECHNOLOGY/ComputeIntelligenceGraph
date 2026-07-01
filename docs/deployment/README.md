# Deployment Notes

Last synchronized with the current release workflow on `2026-03-29`.

## Canonical Domains

| Surface | Origin | Purpose |
| --- | --- | --- |
| Landing | `https://cig.lat` | Public site and authentication entrypoint |
| Dashboard | `https://app.cig.lat` | Protected application UI |
| API | `https://api.cig.technology` | Canonical public API origin and AWS provisioning target |
| Authentik | `https://auth.cig.technology` | Identity provider and social-login broker |

## Current Deployment Surfaces

- `docker-compose.yml` for the full local or single-host stack
- `docker-compose.dev.yml` for development overrides
- `packages/infra/docker/` for container build definitions
- `packages/infra/docker/Dockerfile.dashboard` for the deployable dashboard container
- `packages/infra/docker/Dockerfile.api` for the deployable Fastify API container
- `packages/iac/` for Terraform modules and environment layouts
- `packages/infra/` for the TypeScript deployment wrapper plus the SST AWS runtime stack

## Provisioning Direction

- Provision the standalone API package as the public application API at `api.cig.technology`
- Keep dashboard-only web bridges inside the dashboard deployable surface, not as a second domain API
- Treat health, readiness, metrics, and CORS policy as API deployment concerns owned by `packages/api`
- Keep stateful API core data in Terraform under `packages/iac`
- Keep runtime delivery in SST under `packages/infra`
- Use GitHub Actions as the authoritative production delivery path, with native SST pipeline creation kept manual and disabled by default

## Primary Services in the Local Stack

- Neo4j
- Chroma
- API
- Chatbot
- Discovery
- Dashboard
- Cartography

## Release Build Verification

The repository release workflow currently verifies:

- landing production build
- dashboard production container build
- wizard UI production build

That verification is performed by `scripts/release.sh` during patch, minor, and major releases.

## Chat Runtime Requirements

The production API now owns the full chat tool surface:

- structured file attachments
- infra-aware resource linking
- query/code snippets
- voice transcription through OpenAI

### Required API Env

These values must be present in the API runtime for the full feature set:

```bash
OPENAI_API_KEY=...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1
CHAT_UPLOAD_MAX_BYTES=10485760
CHAT_AUDIO_MAX_SECONDS=120
```

`OPENAI_API_KEY` is required for:

- image summary generation
- audio transcription
- the OpenAI-backed answer path

If the key is missing, the chat endpoint can still answer through the internal fallback logic, but transcription and image enrichment are unavailable.

### Resource Linking And Empty Infrastructure States

The `Link` picker uses the indexed graph, not arbitrary user-provided URLs.

Production behavior now splits clearly:

- if indexed resources exist, chat answers should anchor to those actual resources
- if discovery is reachable but the graph is empty, chat returns setup guidance and docs links
- if discovery is unhealthy, chat states that directly instead of giving a misleading generic clarification

### Browser And Network Requirements For Voice

- microphone capture should run over `https` in cloud environments
- `localhost` remains valid for local development
- the API only persists transcript text and normalized metadata in session history
- raw audio files are not stored in the chat history tables

## Related Deployment Docs

- API on AWS: [api-aws.md](api-aws.md)
- GCP dashboard deployment: [gcloud-dashboard.md](gcloud-dashboard.md)
- Root overview: [../../README.md](../../README.md)
- Status snapshot: [../../PROJECT_STATUS.md](../../PROJECT_STATUS.md)
- Authentication runtime details: [../authentication/README.md](../authentication/README.md)

## Current Constraints

- The API production runtime is intentionally single-task (`desiredCount=1`) until WebSocket fan-out and heartbeat work move out of process
- Supabase Postgres remains external; it is not provisioned by Terraform in this repo
- Native SST pipeline resources are optional follow-up infrastructure and are not mutated during normal production deploys
- `packages/sdk` is a shared client layer, not a deployable runtime surface
