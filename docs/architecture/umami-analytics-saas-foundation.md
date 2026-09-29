# Umami Analytics SaaS — Foundation Decisions

**Status:** accepted for the MVP design; production activation remains gated by the verification items below.

**Decision date:** 2026-09-28
**Audience:** platform, API, dashboard, and security maintainers

This record defines the boundary around the self-hosted Umami data plane. It does not make Umami the tenancy authority: organizations, permissions, sites, entitlements, lifecycle, and audit history belong to the CIG control plane.

## 1. Upstream compatibility and maintenance

| Decision | MVP rule |
| --- | --- |
| Upstream | `umami-software/umami` release `v3.4.0` (release commit `ec0ff50`), delivered by `docker.umami.is/umami-software/umami:3.4.0`. `latest` is prohibited in persistent environments. |
| License | Umami is MIT-licensed. A fork, derived image, or distributed source package must retain the upstream copyright and MIT license text. The CIG branding delta must be a small, separately documented patchset. |
| Runtime and database | The deployment consumes Umami's OCI image; source builds require Node.js 18.18+ and PostgreSQL 12.14+. The MVP standardizes on managed PostgreSQL 16 in UTC, with a direct connection reserved for migrations when a pooler is introduced. |
| Required upstream API surface | The private provisioner uses bearer API-key authentication and only `POST /api/websites`, `GET /api/websites/{id}`, `POST /api/websites/{id}`, and `DELETE /api/websites/{id}`. It must not call Umami from a browser or expose the administration UI to customers. |
| Tracker baseline | Disable Umami telemetry; keep MCP disabled; use a branded script origin, explicit collector origin, `data-domains`, `data-do-not-track="true"`, `data-exclude-search="true"`, and `data-exclude-hash="true"`. `data-domains` is a client-side guard, not authorization. |

Before each upgrade, the release owner must review upstream release notes and security advisories, scan the promoted image, compare the generated API contract used by the provisioner, run a staging create/update/delete and tracker smoke test, and record a rollback image digest. A critical upstream security fix triggers this process immediately; otherwise review occurs at least monthly. Do not change the pinned tag in-place: promote a tested image digest through staging before production.

Umami's documented website API is not an idempotency contract. The control plane therefore owns idempotency keys and its public-ID-to-Umami-ID mapping; retries first reconcile that mapping before creating a new upstream website.

### Tracker translation release gate

Upstream expects an internal Umami website ID in `data-website-id`, while the product contract requires the installed tag to contain only an opaque public `site_...` ID. A direct upstream tracker tag therefore cannot meet the product contract by configuration alone. The customer-facing route must translate the public ID server-side at the collection edge and enforce the control-plane allowed-domain policy before forwarding a native Umami payload. This is a narrow translation proxy, not a general event collector or customer API.

The CIG API now implements that narrow route at `/api/v1/analytics/tracker.js`
and `/api/v1/analytics/collect`. The onboarding UI may claim collection is
active only after the site mapping reaches `active`; it never discloses the
Umami ID. The same release gate applies to any generated or cached tracker
response: it may not place the internal ID in customer-visible markup, browser
storage, or logs.

**Official sources validated on 2026-09-28:** [Umami v3.4.0 release](https://github.com/umami-software/umami/releases/tag/v3.4.0), [MIT license](https://github.com/umami-software/umami/blob/v3.4.0/LICENSE), [installation requirements](https://docs.umami.is/docs/install), [self-hosted API authentication](https://docs.umami.is/docs/api/authentication), [API-client endpoint map](https://docs.umami.is/docs/api/api-client), [environment variables](https://docs.umami.is/docs/environment-variables), and [tracker configuration](https://docs.umami.is/docs/tracker-configuration).

## 2. Portable operating topology

```text
Customer browser
  └─ HTTPS CDN / ingress
       ├─ analytics.<customer-facing-domain>/tag.js ───────┐
       └─ analytics.<customer-facing-domain>/collect ──────┼─ private analytics network
                                                           │    ├─ translation route
Control API + dashboard ─ private service identity ────────┘    ├─ Umami application
                                                                  └─ PostgreSQL
Operators ─ private access / SSO + MFA ──────────────────────────┘
```

The exact customer-facing domain is an environment input, not hard-coded into the product or this record. TLS terminates at portable ingress/CDN infrastructure; only the tracker and collection routes are public. The Umami administration route, PostgreSQL, backup store, and provisioner are private. CIG dashboard users access analytics through CIG API endpoints, never the Umami UI.

Application workloads run as OCI containers with Kubernetes/Helm manifests. OpenTofu modules provide the provider-specific ingress, managed PostgreSQL, DNS, registry, and S3-compatible backup store. This preserves an application-level cloud-neutral boundary while allowing each environment to use managed services.

### Secrets, backups, and recovery

- Inject `DATABASE_URL`, `APP_SECRET`, the optional two-factor key, and the provisioner API key at runtime from the platform secret manager. Do not put values in Git, Helm values, browser bundles, container layers, command lines, or logs.
- Use independent service identities: runtime, migration job, and provisioner. The provisioner credential is limited to the private analytics network and rotated through the secret-management process.
- Retain automated PostgreSQL point-in-time recovery plus daily encrypted logical backups in S3-compatible object storage. The target is RPO ≤24 hours and RTO ≤4 hours for the MVP.
- Back up the control-plane database and Umami database independently. A recovery exercise restores both into a non-production environment, verifies mapping consistency and tenant isolation, and records the result. Do not onboard production telemetry until that exercise passes.
- Capture service health, HTTP latency/error rate, database connectivity/replication capacity, migration result, backup result, restore-test result, provisioning/reconciliation outcome, collection rejection rate, and deletion backlog. Use structured logs and standards-based metrics/traces; exclude raw event payloads, URL query strings, credentials, and internal website IDs from logs.

Alert on unavailable collector or Umami service, sustained 5xx responses, failed migration, missed backup, failed restore test, failed or stalled provisioning, reconciliation drift, and deletion past its service objective. Any alert must identify a correlation ID or opaque record ID, never a credential or raw visitor payload.

## 3. Control-plane data and lifecycle contract

The CIG control plane is authoritative. Umami's `websiteId` is an implementation mapping and is not an organization identifier, customer-visible ID, or authorization input.

| Record | Required fields and invariants |
| --- | --- |
| Organization | Internal immutable ID; display name; plan/entitlement state. Every site belongs to exactly one organization. |
| Membership | Organization ID, authenticated principal ID, and role. Authorization derives organization scope from the authenticated session on the server; a request-supplied organization ID only selects within that authorized scope. |
| Site | Internal immutable ID; organization ID; stable opaque `site_...` public ID; name; normalized allowed domains; lifecycle status; timestamps. Public IDs are generated server-side, unique, never reused, and contain no tenant or provider information. |
| Umami mapping | Site ID, internal Umami website ID, upstream revision/last reconciliation time, provisioning state, and last safe error code. It is writeable only by the provisioner/reconciler and never serialized to a customer client. |
| Usage | Organization/site/time-bucket counters for accepted events and retained-event volume. Counters are derived server-side and contain no raw event payload. Entitlement checks use these counters, not browser claims. |
| Audit event | Opaque actor ID, organization/site IDs, action, outcome, correlation ID, timestamp, and safe metadata. Audit metadata excludes credentials, internal Umami IDs, IP addresses, and raw analytics payloads. |

Lifecycle states are `pending`, `provisioning`, `active`, `failed`, `deleting`, and `deleted`. Only `active` sites may collect or be read by a customer. Delete immediately disables collection and customer reads, records an audit event, then asynchronously removes the upstream website and mapping. Failed provisioning and deletion remain observable and retryable; no retry may create a second active mapping for the same site.

### MVP retention and deletion policy

The initial product policy is 90 days for identifiable/raw analytics event records, 13 months for aggregated site usage, and 12 months for minimal security/audit records. Site deletion begins immediately, removes event data and mapping from the active stores within 30 days, and removes it from backup media as that backup's 35-day retention expires. Aggregates and audit entries retain only the minimum opaque IDs and action metadata required by the stated periods. Legal/privacy review must approve this policy and consent wording before production telemetry; plan-specific retention is out of scope until it is implemented and tested.

## 4. Threat model and release controls

| Threat | Required control | Release evidence |
| --- | --- | --- |
| Tenant-boundary bypass through client-supplied IDs or guessed public IDs | Authenticate first; derive organization scope server-side; scope every read/write by membership; do not use public site IDs as authorization. | Cross-organization and direct-object-ID tests return denial without information leakage. |
| Provisioner privilege misuse or credential theft | Dedicated private service identity, runtime secret injection, least-privilege Umami/API access, secret rotation, safe audit trails, and no browser access. | Secret-delivery review, rejected untrusted caller test, and provisioner audit/reconciliation evidence. |
| Tracker abuse, replay, spoofed site IDs, and ad-blocker workarounds | Server-side public-ID translation, normalized allowed-domain enforcement, payload size/rate limits, abuse monitoring, and cache isolation. `data-domains` augments but does not replace server validation. | Allowed-domain, rejected-domain, malformed-payload, and rate-limit tests. |
| Analytics data leakage through logs, UI, API, caches, or URLs | Tenant-scoped CIG responses, private Umami UI, encrypted transport/storage, redaction, no raw payload/query-string logs, and cache keys that include public site identity without internal IDs. | Log-redaction inspection, authorization tests, and cache/header review. |
| Administrative access compromise | Private operator route, SSO + MFA, least privilege, two-factor encryption key before enabling Umami 2FA, short operational sessions, and audited administrative actions. | Access review and operator-path test; no public Umami administration endpoint. |
| Deleted data reappearing after retry or restore | Immediate collection/read revocation, idempotent deletion state machine, tombstone-aware reconciliation, encrypted backup retention, and restore only into isolated non-production environments. | Delete/retry/reconcile test and recorded non-production restore exercise. |

Residual risk: a tracker identifier is necessarily visible to a page visitor and must be treated as a routing identifier, not a secret or authorization factor. The product must publish its data-collection, consent, retention, deletion, and support behavior before enabling customer telemetry.

## Implementation gates

This record is a design decision, not evidence that the controls exist. The following remain mandatory before a production customer is onboarded:

1. Implement and test the public-ID translation route, allowed-domain enforcement, and tenant-scoped control-plane APIs.
2. Provision the private topology, secret delivery, backups, dashboards/alerts, and a staging release path using the pinned image digest.
3. Complete cross-organization, idempotency/reconciliation, tracker-abuse, deletion, and restore tests.
4. Obtain legal/privacy approval for the retention and consent policy, then publish customer installation/removal guidance.
