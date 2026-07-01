# @cig/infra

AWS deployment foundation for Compute Intelligence Graph.

This package now owns two related concerns:

- the TypeScript deployment wrapper and config surface used by the repo
- the SST runtime stack for the production API at `https://api.cig.technology`

## Ownership Boundary

- `packages/iac` owns stateful/shared API core data:
  - VPC
  - subnets
  - security groups
  - Neo4j instance and storage
- `packages/infra` owns runtime delivery:
  - existing ECR repository reference and lifecycle policy
  - ECS/Fargate service
  - ALB
  - ACM
  - Route53
  - optional native pipeline scaffolding

GitHub Actions is the primary production deployment entrypoint. Release tags and `release-metadata.json` are bookkeeping only; they do not decide whether the API is rebuilt or redeployed. Native SST pipeline creation remains optional and disabled during normal deploys.
The bootstrap helpers are safe to re-run: if the production SST stage already exists, they only ensure the ECR repository is present and do not prune the runtime stack. The runtime deploy then reuses that repository instead of creating a second copy.

This package is also the canonical translation layer from deploy inputs to the API runtime contract. Workflow callers should treat it as the single source of truth for runtime environment variables, secret ARN mapping, and defaults.

## Key Files

- `sst.config.ts` — SST app entrypoint
- `infra.config.ts` — AWS API runtime definition
- `src/deployers/ApiDeployer.ts` — programmatic deploy wrapper for SST
- `src/deployers/apiRuntime.ts` — Terraform-output parsing and runtime config resolution
- `config/pipelines.example.json` — optional native pipeline config example
- `docker/Dockerfile.api` — production container for `packages/api`
- `docker/Dockerfile.dashboard` — production container for `apps/dashboard`
- `docker/Dockerfile.discovery` — production container for `packages/discovery`
- `docker/Dockerfile.chatbot` — production container for `packages/chatbot`

## Docker Builds

Container build definitions live in `packages/infra/docker/` alongside the deployment package that owns them. Docker contexts are always the monorepo root so cross-package `COPY` instructions work correctly.

```bash
# API (from repo root)
docker build -f packages/infra/docker/Dockerfile.api -t cig-api:local .

# Dashboard
docker build -f packages/infra/docker/Dockerfile.dashboard -t cig-dashboard:local .
```

All four images are also built and published by `.github/workflows/publish-images.yml` and the per-service deploy workflows. The `docker-compose.yml` at the repo root references these Dockerfiles by their new paths.

## API Config Surface

Programmatic/public types exported by this package:

- `ApiDeploymentConfig`
- `ApiDeploymentResult`
- `ApiRuntimeConfig`
- `ApiCoreTerraformOutputs`

Core runtime inputs:

- `API_DOMAIN`
- `API_IMAGE_REPOSITORY`
- `API_VPC_ID`
- `API_ALB_SECURITY_GROUP_ID`
- `API_PUBLIC_SUBNET_IDS`
- `API_PRIVATE_SUBNET_IDS`
- `API_SECURITY_GROUP_IDS`
- `API_DATABASE_URL_SECRET_ARN`
- `API_JWT_SECRET_ARN`
- `API_NEO4J_BOLT_URI`
- `API_NEO4J_PASSWORD_SECRET_ARN`
- `API_AUTHENTIK_ISSUER_URL_SECRET_ARN`
- `API_AUTHENTIK_JWKS_URI_SECRET_ARN`
- `API_AUTHENTIK_TOKEN_ENDPOINT_SECRET_ARN`
- `API_OIDC_CLIENT_ID_SECRET_ARN`
- `API_OIDC_CLIENT_SECRET_SECRET_ARN`
- `API_CORS_ORIGINS`
- `API_SMTP_HOST`
- `API_SMTP_PORT`
- `API_SMTP_SECURE`
- `API_SMTP_FROM_EMAIL`
- `API_SMTP_USER`
- `API_SMTP_AUTH_ENABLED`
- `API_SMTP_OTP_SUBJECT`
- `API_SMTP_PASSWORD_SECRET_ARN`

Any new API runtime variable or secret should be added here first, then mirrored into the workflow and deployment docs. That keeps the runtime contract centralized instead of splitting it across GitHub Actions shell logic.

`API_SMTP_USER` mirrors `API_SMTP_FROM_EMAIL` in production. The repository uses a placeholder example address, not the production mailbox, and the application still falls back to `API_SMTP_FROM_EMAIL` if `API_SMTP_USER` is omitted.

In production deploys, the runtime sender/login is resolved from AWS Secrets Manager as the `smtp-from-email` secret. The repo keeps the real mailbox address out of plain text, and the deployed task definition still receives the resolved value as `SMTP_FROM_EMAIL` / `SMTP_USER`.

Bootstrap-only mode uses:

- `INFRA_API_BOOTSTRAP_ONLY=true`
- `INFRA_CREATE_PIPELINES=false`

## Commands

```bash
pnpm --filter @cig/infra test
pnpm --filter @cig/infra build
pnpm --filter @cig/infra diff:api:prod
pnpm --filter @cig/infra bootstrap:api:prod
pnpm --filter @cig/infra deploy:api:prod
pnpm --filter @cig/infra bootstrap:api:pipelines
```

## Production Flow

1. Terraform in `packages/iac/environments/api-prod` applies networking and Neo4j.
2. GitHub Actions syncs runtime secrets into AWS Secrets Manager.
3. GitHub Actions detects API impact from the tagged commit and skips release-noise-only tags entirely.
4. If the API source changed, GitHub Actions resolves an existing `api-src-<hash>` digest or builds and pushes that immutable image once with `sha-<commit>` and `api-src-<hash>` tags.
5. If only runtime wiring changed, GitHub Actions reuses the last published digest for that source fingerprint and skips rebuilding. A manual dispatch without `image_tag` can also seed a missing digest instead of failing.
6. If the API source changed, GitHub Actions runs `pnpm --filter @cig/api migrate:up` against Supabase Postgres.
7. If deploy wiring changed, GitHub Actions applies the API core-data Terraform stack.
8. GitHub Actions runs the full SST deploy for the ECS/Fargate runtime using the resolved ECR digest.
9. GitHub Actions runs health, authenticated REST, GraphQL, and WebSocket smoke checks.

## Related Docs

- [../iac/README.md](../iac/README.md)
- [../../docs/deployment/README.md](../../docs/deployment/README.md)
- [../../docs/deployment/api-aws.md](../../docs/deployment/api-aws.md)
