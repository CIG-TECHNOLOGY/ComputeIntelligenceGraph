# Umami PostgreSQL backup and restore runbook

This procedure is portable across PostgreSQL-compatible services. It covers the
Umami database only; the SaaS control plane is backed up and restored separately.
Do not copy a production backup to a developer machine or an unapproved
environment.

## Preconditions

- Use PostgreSQL client tools compatible with the server's major version.
- Provision a dedicated, least-privileged backup role. It needs read access to
  the Umami database but no DDL, application DML, or owner privileges.
- Retrieve PostgreSQL connection settings through a protected libpq service
  file (`PGSERVICEFILE`) and password file (`PGPASSFILE`). Never put a resolved
  connection URL or password in a command line, Git, shell history, logs,
  tickets, or CI output.
- On Unix-like systems, ensure both files are owned by the operator and use
  mode `0600`; libpq rejects an insecure password file. Keep the service file
  and password file outside the repository and backup artifact directory.
- Store backup artifacts in access-controlled, encrypted object storage with a
  documented retention period and a separate encryption-key recovery process.
- Run a restore rehearsal in an isolated non-production database before relying
  on a new backup schedule or Umami release.

## Backup

1. Record the running Umami image tag and the UTC timestamp in the change
   record. Before an upgrade, take this backup while the existing service is
   still healthy.
2. Retrieve the protected libpq files from the secret manager. The service file
   defines a named TLS connection (host, port, database, and backup user); the
   password file provides the password. They contain no shell interpolation or
   committed values. Select the service without exposing a URL:

   ```bash
   export PGSERVICE=umami-backup
   export PGSERVICEFILE=/secure/path/pg_service.conf
   export PGPASSFILE=/secure/path/pgpass
   chmod 0600 "$PGSERVICEFILE" "$PGPASSFILE"
   ```

3. Create a custom-format logical dump, excluding source ownership and grants.
   `pg_dump` resolves credentials only from the protected libpq files:

   ```bash
   pg_dump --format=custom --no-owner --no-privileges \
     --file umami-YYYYMMDDTHHMMSSZ.dump
   ```

4. Verify that the dump is readable and record its checksum without exposing
   connection details:

   ```bash
   pg_restore --list umami-YYYYMMDDTHHMMSSZ.dump >/dev/null
   sha256sum umami-YYYYMMDDTHHMMSSZ.dump
   ```

5. Upload the artifact and checksum to the approved encrypted backup location.
   Confirm upload integrity, then remove the local artifact using the
   organization’s approved secure-cleanup procedure.

Logical dumps are the portable baseline. If the database platform also offers
point-in-time recovery, document its retention, restore owner, and test result
alongside this runbook; it does not replace a periodic portable restore test.

## Restore rehearsal (required before production use)

1. Create an isolated, empty target database and a least-privileged role. Never
   target a shared, production, or customer-facing database.
2. Retrieve the approved backup into a protected temporary location and verify
   its checksum and `pg_restore --list` output.
3. Select a dedicated restore service in protected libpq files for the empty
   target database. This role may create the required schema but must be scoped
   to the isolated target. Restore without passing a resolved URL or password:

   ```bash
   export PGSERVICE=umami-restore-target
   export PGSERVICEFILE=/secure/path/pg_service.conf
   export PGPASSFILE=/secure/path/pgpass
   chmod 0600 "$PGSERVICEFILE" "$PGPASSFILE"
   pg_restore --exit-on-error --no-owner --no-privileges \
     umami-YYYYMMDDTHHMMSSZ.dump
   ```

4. Run the pinned migration job exactly once. It performs Umami's database
   compatibility check and Prisma migration deployment using the isolated
   migration-role secret reference:

   ```bash
   docker compose --env-file /secure/path/umami.env -f compose.yaml \
     --profile migration run --rm umami-migrate
   ```

5. Start the pinned application against the isolated database and wait for its
   health check:

   ```bash
   docker compose --env-file /secure/path/umami.env -f compose.yaml up -d umami
   docker compose --env-file /secure/path/umami.env -f compose.yaml ps
   ```

6. Verify the service responds on `/api/heartbeat`, authenticate with a
   non-production operator account, and perform agreed non-sensitive analytics
   checks. Record the backup timestamp, restore duration, image tag, health
   result, and operator in the change record.
7. Stop the rehearsal service, revoke temporary database access, and remove the
   temporary backup under the approved cleanup process.

## Production recovery

Production recovery requires an incident/change owner and an explicit target
database approval. First stop all Umami application replicas to prevent writes.
Restore only to the approved replacement database, then run the same migration
job once, deploy the pinned application, and verify health before reopening
traffic. Do not use `pg_restore --clean` against an unresolved target: it drops
objects and is appropriate only after the recovery owner has confirmed the
database is disposable.

## Non-production migration and runtime-health rehearsal

Perform this after a backup restore and before every new Umami release reaches
production. Use a dedicated non-production database with separate runtime and
migration roles; do not use a production secret reference.

1. Put `UMAMI_RUNTIME_DATABASE_URL`, `UMAMI_MIGRATION_DATABASE_URL`, and
   `UMAMI_APP_SECRET` in an operator-only secret file. Confirm the runtime role
   has no DDL privileges and the migration role is absent from the runtime
   service definition.
2. Run the pinned one-shot migration job exactly once and capture its exit code:

   ```bash
   docker compose --env-file /secure/path/umami-nonprod.env -f compose.yaml \
     --profile migration run --rm umami-migrate
   ```

3. Start the read-only runtime, wait for Compose health, and check the upstream
   heartbeat on its loopback-only port:

   ```bash
   docker compose --env-file /secure/path/umami-nonprod.env -f compose.yaml \
     up -d --wait umami
   curl --fail --silent --show-error http://127.0.0.1:3005/api/heartbeat
   ```

4. Exercise a pre-agreed non-sensitive analytics operation with a
   non-production account. Confirm the runtime role performs its required
   reads/writes while a DDL attempt made with that role is denied. Stop the
   test service and revoke any temporary access.

Record this evidence with the release:

```text
Environment: non-production
Operator and UTC timestamp:
Umami release tag and OCI digest:
Migration job exit code: 0
Runtime container user / root filesystem: 1001:1001 / read-only
Compose health status and heartbeat HTTP status: healthy / 200
Runtime DDL denial verified: yes
Backup restore artifact timestamp and checksum verified:
Observed migration and startup duration:
Exceptions or rollback decision:
```

## Release gates: backup schedule and ownership

Before customer onboarding or any production release, the release owner must
record and approve the backup cadence, retention duration, storage location,
encryption-key owner, RPO/RTO target, restore-test frequency, and incident
escalation contacts. Missing any of these is a release blocker. Those
environment-specific choices intentionally do not live in this portable Compose
package.
