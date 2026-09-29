# Feature: Umami Analytics SaaS

**Status:** active — architecture and MVP implementation are the current milestone
**Priority:** high
**Owner:** platform and dashboard teams
**Product:** branded, multi-tenant web analytics SaaS built around a maintainable self-hosted Umami integration

## Goal

Deliver a cloud-neutral, shared-tenancy MVP that lets an organization create a website and install one branded tracking tag without exposing Umami implementation identifiers. The SaaS control plane is authoritative for organizations, sites, entitlements, usage, and audit records; Umami supplies analytics capabilities behind that boundary.

## Scope

The first release includes:

1. A version-pinned, self-hosted Umami deployment with PostgreSQL, application secrets outside Git, health checks, backups, and a reproducible local/staging path.
2. A control-plane data model for organizations, members, sites, internal public site IDs, Umami website-ID mappings, plan/usage state, and auditable provisioning actions.
3. Dashboard onboarding that creates a site, provisions its underlying Umami website, and shows a copyable tag using the public site ID:

   ```html
   <script defer src="https://cdn.example.com/tag.js" data-site="site_..."></script>
   ```

4. A branded tracker delivery path and the minimum configuration needed for direct Umami collection during the MVP.
5. Server-side authorization and tenant isolation for every control-plane read, write, provisioning call, and mapping lookup.
6. Product documentation for HTML and Google Tag Manager installation, tracker verification, data collection behavior, and removal.

## Explicitly Deferred

- A custom collector/gateway, queues, bot filtering, geo routing, and server-side event API.
- Isolated databases, dedicated namespaces/accounts, reseller white labeling, custom customer domains, and multi-region data residency.
- Billing-provider integration, enterprise SSO/SCIM/SAML, native SDKs, and a Google Tag Manager community template.
- A broad rewrite of upstream Umami or embedding billing, identity, organization management, or support workflows inside it.

## Architecture Boundary

```text
Customer portal + control API
        │ owns organizations, sites, plans, audit, public site IDs
        ▼
Provisioner ───────► version-pinned Umami
        │                    │ owns analytics website/event records
        └── public site ID ──┘ maps to internal Umami website ID
```

Keep application business logic in portable containers and Kubernetes/Helm assets. Keep provider-specific networking, managed PostgreSQL, object storage, DNS, and registry integration in OpenTofu modules. A customer-facing tag must use the platform site ID rather than an Umami UUID so the analytics backend can change without requiring customers to reinstall tags.

## Non-Negotiable Constraints

- Verify the chosen upstream Umami release, its license obligations, API compatibility, supported runtime/database versions, and tracker configuration before implementation; retain required notices in the fork/distribution.
- Pin application and base-image versions. Never deploy `latest` to a persistent environment.
- Do not store secrets, database URLs, credentials, access keys, customer analytics payloads, or production identifiers in Git, task files, logs, browser storage, or client bundles.
- The control plane—not an Umami team or user record—is the source of truth for SaaS tenancy and authorization.
- Enforce organization membership and role checks server-side. Do not accept a client-supplied organization ID as authorization.
- Do not expose Umami administration to customers. Branding must be configuration-driven and kept as a small, documented patchset that can be rebased onto upstream releases.
- Use PostgreSQL-compatible persistence, OCI images, OpenTofu, Kubernetes/Helm, S3-compatible storage, and standards-based telemetry. Do not embed AWS-only application dependencies.
- Collect only documented analytics data, provide a removal path, and complete privacy, retention, deletion, and consent decisions before production customer telemetry.

## Ordered Checklist

### 1. Validate the foundation

- [x] Record the pinned upstream Umami release, license/notice requirements, security-update process, database/runtime support, API endpoints needed for website provisioning, and tracker configuration choices.
- [x] Decide the MVP hosting topology, ingress/CDN domains, secret delivery, PostgreSQL backup/restore approach, and observability baseline without committing credentials or account identifiers.
- [x] Define the product data contract: public IDs, organization/site ownership, lifecycle states, usage counters, retention/deletion rules, and audit events.
- [x] Produce a threat model covering tenant-boundary bypass, provisioner privilege, tracker abuse, data leakage, administrative access, and deletion/restore.

### 2. Build the portable deployment path

- [x] Add the version-pinned Umami integration/deployment assets, including application configuration, secret references, health probes, migration sequencing, resource limits, and backup/restore runbook.
- [x] Provision the production Umami data plane with the pinned image, an isolated PostgreSQL schema and least-privilege runtime/migration roles, ECS internal ingress, one-shot migration, log retention, and secret-managed bootstrap credentials; remove temporary bootstrap access after activation.
- [ ] Create a minimal branding layer for product name, logo, favicon, support/docs URLs, and customer-facing domains; document the upstream patchset.
- [ ] Add CI checks for image/version pinning, configuration validation, migration safety, and a staging smoke test.

### 3. Implement control-plane tenancy and provisioning

- [x] Add organization-scoped models and migrations for sites, public site IDs, Umami mappings, lifecycle status, usage records, and audit records.
- [x] Implement server-authorized site create/list/read/update/delete operations and a provisioner that creates/updates/deletes the corresponding Umami website idempotently.
- [x] Ensure mapping lookups, retries, failed provisioning states, reconciliation, and deletion behavior are observable and auditable.
- [ ] Add authorization, cross-organization isolation, idempotency, failure/retry, and reconciliation tests. (Route coverage is written; full DB-backed execution is blocked in this workspace by the prebuilt `better-sqlite3` native module requiring a rebuild for the active Node ABI.)

### 4. Ship the customer onboarding MVP

- [x] Add the dashboard flow to create a site, show the branded copyable tag, explain HTML/GTM installation, and verify an initial event without revealing an Umami UUID.
- [x] Serve the tracker from the branded delivery endpoint with correct cache and security headers; validate allowed-domain behavior.
- [x] Document tracker installation, custom-event limitations, privacy/consent expectations, support escalation, and removal steps.
- [x] Add an authenticated, standalone signal-room dashboard for each site with Umami-backed totals, traffic series, realtime visitors, top paths, and audience geography.
- [x] Add opt-in, revocable public share links that expose only the read-only signal room and never the Umami administration surface or internal website ID.

### 5. Prove operational readiness

- [ ] Run local and staging end-to-end tests: create organization → create site → provision Umami → install tag → receive analytics → view tenant-scoped result → delete site.
- [ ] Restore a backup in a non-production environment and record the result.
- [ ] Conduct a security/privacy review of the control-plane authorization boundary, tenant data isolation, logs, secret handling, deletion, and upstream patch/update process.
- [ ] Record MVP capacity limits and the evidence-based threshold for introducing a collector/gateway or isolated deployment tier.
- [x] Release the API and dashboard analytics patch to AWS and run the production create → provision → tracker → collect → stats → delete smoke path.

## Acceptance Criteria

- [ ] A permitted organization member can create and manage only their organization’s sites; all cross-organization access and direct-object-ID attempts are denied and tested.
- [ ] Site provisioning produces one stable public `site_...` ID and one internal Umami website mapping, with idempotent retry/reconciliation behavior and an audit trail.
- [ ] The dashboard gives customers a branded HTML tag and GTM guidance; the tag works for the approved domain without exposing an Umami administration surface or internal website UUID.
- [ ] Umami runs from a pinned, documented upstream version with migrations, health checks, secret injection, logs/metrics, and a tested PostgreSQL restore path.
- [ ] The SaaS-specific control plane remains portable: no static cloud credential is embedded in code and no business workflow depends on an AWS-only service.
- [ ] The fork/branding delta, license notices, upgrade process, data handling, retention, deletion, and operational ownership are documented before production onboarding.

## Evidence Required to Move to Done

- Version/compatibility and licensing record for the selected upstream release.
- Architecture, threat-model, and privacy/retention decision records.
- Passing tenant-isolation, provisioning, and end-to-end tracker tests.
- Staging deployment evidence, health/observability checks, and non-production backup-restore result.
- Security review sign-off and a documented release/rollback and upstream-update procedure.

## Implementation Log

- 2026-09-28: Added the `packages/api/src/analytics/site-id.ts` contract for opaque public `site_...` IDs, with focused tests. Added a version-pinned, loopback-only local Umami Compose baseline under `infrastructure/umami/`; customer provisioning and the public-ID-to-Umami-ID translation layer remain pending.
- 2026-09-28: Completed and independently reviewed the foundation decision record at `docs/architecture/umami-analytics-saas-foundation.md`, covering upstream compatibility/licensing, portable topology, tenancy contract, and threat model (panel median: 4.57/5). Production promotion still requires immutable image evidence, API permission/schema validation, backup-key/access specifics, and the collection-translation route contract.
- 2026-09-28: Hardened the portable Umami deployment baseline under `infrastructure/umami/` with a verified v3.4.0 OCI digest, distinct runtime/migration database secret references and privilege boundaries, non-root read-only containers, health/migration rehearsal steps, and a secret-safe PostgreSQL backup/restore runbook (panel median: 4.64/5). Backup scheduling, RPO/RTO, encrypted storage, and restore ownership remain explicit production release gates.
- 2026-09-28: Released the dashboard image to AWS ECS/Fargate behind a dedicated ALB, validated the target and HTTPS response, and moved the task to public subnets because the existing private subnets had no Secrets Manager/NAT path. Added `app.cig.lat` and ACM validation CNAMEs in Spaceship DNS; the remaining Umami MVP checklist is unchanged.
- 2026-09-28: Rechecked the reported Google OAuth URL against the live AWS deployment: `/auth/login/google` returns the expected 302 to the Authentik `cig-google-login` flow, the flow returns 200, and Authentik hands off to Google with a 302. The 404 is not reproduced on the authoritative DNS/AWS path; stale client or recursive DNS cache remains the likely cause.
- 2026-09-29: Corrected the dashboard OAuth client mismatch: Authentik had the `cig-dashboard` provider while the ECS image generated the stale `G4D6...` client ID. Rebuilt/pushed the dashboard image, deployed ECS task definition revision 2, and verified `prompt=none` now accepts the client and returns cleanly to the landing sign-in path when no Authentik session exists. Production callback-secret injection remains pending secure credential handoff.
- 2026-09-29: After explicit approval, synchronized the current Authentik dashboard provider secret into AWS Secrets Manager, granted the ECS execution role read access, and deployed task definition revision 3. ECS now reaches steady state with the corrected client ID and callback secret available at runtime.
- 2026-09-29: Implemented the analytics MVP control plane: migration `009_analytics_saas.sql`, organization bootstrapping, tenant-scoped site CRUD, public-ID/Umami mapping, idempotent provisioning, retry/reconciliation/deletion lifecycle, aggregate usage counters, audit events, and the SDK surface. Added the public tracker/collection edge with origin enforcement, payload limits, cache/security headers, and no Umami UUID in customer-visible markup. Added the dashboard Analytics onboarding/install/verification experience and `docs/analytics/README.md`. API/SDK/dashboard type checks pass; database-backed route execution remains to be rerun after the repository's native `better-sqlite3` module is rebuilt for the active Node ABI.
- 2026-09-29: Reconciled the portable Umami README and foundation decision record with the implemented translation edge. Production activation still requires runtime `UMAMI_API_URL`, `UMAMI_API_TOKEN`, and collector URL injection through the secret manager; local provisioning mode is intentionally for rehearsal only.
- 2026-09-29: Final validation pass: API and SDK builds/lints, dashboard type-check, focused site-ID/tracker tests, and the full SDK test suite pass. The dashboard production build also completed successfully; the remaining test-environment issue is the database-backed route suite's unavailable `better-sqlite3` native binding, not an application compile failure.
- 2026-09-29: Provisioned production Umami v3.4.0 in AWS ECS behind an internal ALB, using the isolated `cig_umami` PostgreSQL schema with a DML-only runtime role and DDL-capable migration role. The one-shot migration completed, logs retain 30 days, and application/provisioner credentials are managed in Secrets Manager; the temporary admin bootstrap listener and security-group rule were removed. Deployed the API analytics image and dashboard Analytics image, applied migration `009_analytics_saas.sql`, and resumed the API at one task using the explicit public-subnet profile because the private NAT route remains hibernated. Production E2E create/provision/tracker/collect/stats/delete passed (`active`, `200`, `202`, `1`, `200`). The Umami container health check was removed after a false ECS container-health failure while the ALB heartbeat remained healthy. Remaining gates are portable IaC/CI branding checks, backup/restore rehearsal, and security/privacy sign-off.
- 2026-09-29: Released the complete `develop` snapshot as `v1.0.21` and pushed the branch/tag to both configured remotes. The live AWS Umami, API, and dashboard services remain healthy (`desired=1`, `running=1`, completed rollouts; public API/dashboard smoke `200`). The tag-triggered API workflow skipped because its source-impact detector saw only release metadata; a manual promotion attempt was blocked by the repository's GitHub OIDC role trust, while the legacy dashboard workflow and Docker Hub image bundle also lack their external credentials. These CI credentials are a follow-up promotion gate; the already deployed AWS release remains active.
- 2026-09-29: After explicit approval, synchronized the missing Supabase pooler URL, Supabase service-role key, and JWT secret into the GitHub `production` environment without exposing values. Added production Umami runtime variables and scoped image/core-data/migration jobs to the approved production environment; the workflow changes are committed on `develop` (`327faf9`, `a97e7a2`). Repaired the production Terraform backend lock-table region and recreated the deleted NAT gateway/private route without applying unrelated Neo4j drift. Production API deployment run `36541080832` completed successfully; ECS reached steady state and the public API health check returned `200`.
- 2026-09-29: Added the standalone Analytics signal room at `/analytics/:siteId` and public read-only route at `/analytics/share/:token`. The API now normalizes Umami v3.4 stats/pageviews/metrics/realtime data, keeps a local aggregate fallback, stores only SHA-256 public-share token hashes, supports rotation/revocation, and returns no internal Umami mapping. Added migration `010_analytics_public_access.sql`, SDK contracts, dashboard charts/map/realtime panels, and route coverage for public-link lifecycle. API and dashboard builds/type checks pass; DB-backed route execution remains blocked by the workspace's missing `better-sqlite3` binding for the active Node ABI.
- 2026-09-29: Released the analytics signal-room implementation as `v1.0.22` (`5db6202`) from `develop` and pushed the branch/tag to both configured remotes. The API release workflow completed its impact-detection job but skipped deployment because the tag contained release metadata only; the dashboard workflow stopped before build because the repository has no GCP Workload Identity secrets and its configured project target differs from the live Cloud Run project. Production IAM repair and dashboard promotion remain explicitly blocked pending authorization to provision a dedicated GCP OIDC deploy identity.
