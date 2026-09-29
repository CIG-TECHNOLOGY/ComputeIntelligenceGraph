# CIG Analytics MVP

CIG Analytics keeps organizations, site ownership, lifecycle, usage counters, and audit records in the CIG control plane. Umami is an implementation detail behind the API; customer browsers never call its administration API and the install tag contains only the opaque `site_...` identifier.

## Configure the data plane

For a local/demo install, set `ANALYTICS_PROVISIONING_MODE=local`. This provisions a local mapping and records aggregate counters in the CIG database so onboarding and tracker verification can be exercised without an Umami server.

Managed production does not silently fall back to local mappings: if the upstream values are missing, provisioning fails with a retryable configuration error.

For a real Umami instance, inject these values at runtime through the environment/secret manager (never commit them):

```text
ANALYTICS_PROVISIONING_MODE=upstream
UMAMI_API_URL=https://analytics.internal.example
UMAMI_API_TOKEN=<server-side API key>
# Optional: UMAMI_TEAM_ID=<private team identifier>
ANALYTICS_COLLECTOR_URL=https://api.example.com/api/v1/analytics/collect
```

Apply the CIG control-plane migrations before opening the dashboard (`CIG_AUTO_MIGRATE=true` for a controlled service start, or the repository's `pnpm --filter @cig/api migrate:up` release step). Migrations `009_analytics_saas.sql` and `010_analytics_public_access.sql` are portable across the supported PostgreSQL and local SQLite modes.

The token needs only the private Umami website create/update/delete and collection permissions described in the foundation decision record. The CIG API maps each public site ID to its internal Umami website ID and keeps that mapping out of API responses, tracker markup, browser storage, and logs.

## Onboard a website

1. Open **Analytics** in the dashboard and enter a site name and approved hostname.
2. Wait for the site to reach **active**. A failed upstream provision remains visible and can be retried; retries reconcile the existing mapping before creating another website.
3. Copy the generated HTML snippet into the customer page `<head>`, or create a Google Tag Manager **Custom HTML** tag with the same snippet and an **All Pages** trigger.
4. Load an approved page, then refresh the dashboard. The aggregate pageview counter is the verification signal.

## Detailed signal room

Each active site has a standalone **signal room** at `/analytics/<site-id>` behind the normal dashboard login. It reads the server-side Umami API and presents pageviews, visitors, visit duration, a traffic series, top paths, country geography, and the realtime visitor window. The CIG API keeps the Umami website UUID and bearer token server-side; if the upstream is temporarily unavailable, the room falls back to the control-plane aggregate counters.

Owners can create a read-only public room from the page. The API stores only a SHA-256 hash of the share token and supports rotation/revocation. Public URLs are `/analytics/share/<token>` and never grant tracker administration, site editing, or access to the Umami admin surface. Treat a public link as a bearer credential and revoke it when it is no longer needed. Umami also supports native share URLs and boards, but those remain an operator-only option in this deployment; the CIG room is the customer-facing boundary.

The collector accepts pageviews and named custom events (`window.cigAnalytics.track("signup", { plan: "pro" })`). Payloads are size-limited and accepted only when the browser `Origin` matches the normalized site domain. `data-domains`-style client checks are not used as authorization; the API is authoritative.

## Privacy and removal

The MVP stores aggregate daily counters in the control plane and forwards the minimum page URL/title/referrer/event data needed by the configured Umami instance. Product teams must obtain consent where required by applicable law before enabling tracking and should document the tracker in their privacy notice.

Removing a site immediately disables collection and dashboard reads, writes an audit event, and then deletes the mapped Umami website. Failed deletion remains retryable and visible. The current retention target is 90 days for raw analytics data, 13 months for aggregate usage, and 12 months for minimal audit records; legal/privacy approval is still required before production telemetry.

## Operational limits

The MVP uses the API as a narrow public-ID translation edge. It has no queue, bot filtering, geo routing, or customer-facing event API. Monitor collector 4xx/5xx rates, failed provisioning/deletion, upstream availability, and database capacity before increasing limits or adding a dedicated collector tier.
