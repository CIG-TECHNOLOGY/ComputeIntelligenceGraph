# Umami deployment baseline

This is the non-production bootstrap for the analytics data plane. It deliberately runs only Umami; PostgreSQL is supplied as a separate managed or locally provisioned PostgreSQL-compatible service. The control plane, tenant mappings, and public `site_...` IDs remain outside Umami.

## Current pin

- Upstream: `umami-software/umami`
- Release: `v3.4.0`
- Image: `docker.umami.is/umami-software/umami:3.4.0@sha256:85909afc45bdcda1917394594a087421fdbb05610fded0fa9f6fb861abb2f367`
- License: MIT; retain its required notices when distributing a fork or derived image.

The multi-platform OCI index digest was resolved directly from Umami's public
registry on 2026-09-28 with:

```bash
docker buildx imagetools inspect docker.umami.is/umami-software/umami:3.4.0
```

The pin must be reviewed against the upstream release notes and security
advisories before each upgrade. Never replace it with `latest` in a persistent
environment.

## Local setup

1. Copy `.env.example` to an operator-only secret file (for example,
   `/secure/path/umami.env`); do not use a repository-root `.env` that may
   contain unrelated application secrets.
2. Create two PostgreSQL secret references configured for UTC:
   `UMAMI_RUNTIME_DATABASE_URL` uses a DML-only role for the long-running
   service; `UMAMI_MIGRATION_DATABASE_URL` uses a direct, DDL-capable role only
   for the one-shot migration job. Do not route the migration role through a
   transaction pooler, and do not inject either role into the other service.
3. Generate a unique application secret with `openssl rand -hex 32` and assign it to `UMAMI_APP_SECRET`.
4. Apply schema migrations once with
   `docker compose --env-file /secure/path/umami.env -f compose.yaml --profile migration run --rm umami-migrate`.
5. Start the service with
   `docker compose --env-file /secure/path/umami.env -f compose.yaml up -d umami`.
6. Put TLS, public routing, and tracker delivery behind a separate reverse proxy. The Compose port is loopback-only by design.

`TWO_FACTOR_ENCRYPTION_KEY` is optional. When enabling Umami's built-in two-factor authentication, generate a distinct 64-character hex value with `openssl rand -hex 32`.

## Security and operating rules

- Keep the environment-file values in the deployment secret manager, never in Git.
- Grant the runtime database role only the connection, schema usage, and DML
  privileges needed by the pinned Umami release. It must not receive `CREATE`,
  `ALTER`, `DROP`, role-management, or database-owner rights. Grant the
  migration role the required schema/migration-table DDL rights and inject it
  only for the short-lived `umami-migrate` job.
- Set and rotate `APP_SECRET` through the platform secret-management process; do not rotate it without a session-impact plan.
- Run the `umami-migrate` profile as one controlled job before rolling out a new application version; the normal service has migrations disabled so replicas cannot race to migrate.
- Take automated PostgreSQL backups and test restores before onboarding customer telemetry. Follow the portable [backup and restore runbook](backup-restore.md).
- Keep Umami's administration endpoint private to operators. Customer access belongs in the control-plane portal.
- Configure customer tracker domains and collection paths only after the control-plane site mapping and server-side authorization exist.

The liveness probe is Umami's upstream `/api/heartbeat` endpoint. A green probe
means the HTTP service is serving; database reachability and schema-version
checks occur during the controlled migration job and each app startup. Resource
limits are deliberately conservative defaults for the MVP. Capacity testing must
set the production values before customer telemetry is accepted.

The services run explicitly as UID/GID `1001` with a read-only root filesystem
and a bounded `/tmp` tmpfs. This was verified against the pinned upstream image:
its image metadata declares the `nextjs` user and a loopback-only, read-only
filesystem smoke test reached `/api/heartbeat` successfully. Upstream
`update-tracker.js` writes `public/script.js` only when `COLLECT_API_ENDPOINT`
is set, so that variable is intentionally not supported by this hardened
runtime. If a custom collection path is needed later, build and pin an immutable
tracker artifact rather than making the application filesystem writable.

## Tracker integration status

Umami's native tracker requires an internal Umami website ID. The CIG API now
serves the customer-facing tag at `/api/v1/analytics/tracker.js?site=site_...`
and translates collection requests at `/api/v1/analytics/collect`; the browser
only receives the public site ID. Set `ANALYTICS_PROVISIONING_MODE=upstream`,
`UMAMI_API_URL`, `UMAMI_API_TOKEN`, and `ANALYTICS_COLLECTOR_URL` through the
runtime secret manager before enabling production telemetry. The local mode is
for development and end-to-end rehearsal only.

## Production AWS activation

The production MVP runs the same pinned image as an ECS/Fargate service behind
an internal application load balancer. PostgreSQL remains managed outside the
cluster in a dedicated `cig_umami` schema with separate DML-only runtime and
DDL-capable migration roles. The migration role is used only by the one-shot
release job; the long-running task receives the runtime URL and application
secret from AWS Secrets Manager. CloudWatch logs are retained for 30 days.

The Umami admin surface has no public DNS record. Operators reach it only
through the private network during bootstrap; the temporary bootstrap listener
and security-group rule are removed before the service is considered ready.
The ALB probes `/api/heartbeat`, which is the authoritative service health
signal for the ECS deployment.

## Branding and public domains

The public configuration contract for product presentation, help links, and
customer-facing application/tracker origins lives in
[branding/](branding/README.md). It distinguishes the small build-time UI
patchset from the upstream runtime settings, and records the rebase procedure
for every upstream update. It does not enable tracker delivery or turn Umami
into the customer control plane.

## Sources

- [Umami installation](https://docs.umami.is/docs/install)
- [Umami environment variables](https://docs.umami.is/docs/environment-variables)
- [Umami release v3.4.0](https://github.com/umami-software/umami/releases/tag/v3.4.0)
