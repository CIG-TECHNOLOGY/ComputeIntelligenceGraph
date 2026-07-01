---
id: README
title: Deployment Notes
description: Current deployment surfaces and environment requirements
sidebar_position: 1
---

# Deployment Notes

This page summarizes the current deployment surfaces for CIG.

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

## Chat Runtime Requirements

The production API owns the full chat tool surface:

- structured file attachments
- infra-aware resource linking
- query/code snippets
- voice transcription

### Required API Env

```bash
OPENAI_API_KEY=...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1
CHAT_UPLOAD_MAX_BYTES=10485760
CHAT_AUDIO_MAX_SECONDS=120
```

## Resource Linking and Demo Mode

- `live` mode uses discovery-backed infrastructure
- `demo` mode uses the shared seeded demo workspace
- the Dashboard should always reflect the selected graph source

## Browser And Network Requirements For Voice

- microphone capture should run over `https` in cloud environments
- `localhost` remains valid for local development
- raw audio files are not stored in the chat history tables

