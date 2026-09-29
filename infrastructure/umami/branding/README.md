# Umami branding configuration

This directory is the single public configuration contract for the CIG Analytics
Umami presentation layer. It intentionally does not add organizations, billing,
identity, support workflows, or customer-domain routing to Umami. Those remain
in the control plane and ingress layers.

Copy `branding.env.example` to an operator-controlled deployment configuration
file and replace all `example.com` values. These are public URLs, not secrets;
keep database URLs, `APP_SECRET`, and provider credentials in the secret file
described by the parent deployment README.

## Configuration contract

| Variable | Consumer | Purpose |
| --- | --- | --- |
| `UMAMI_BRAND_NAME` | small custom-image patch | Browser titles and product labels. |
| `UMAMI_BRAND_HOME_URL` | small custom-image patch | Product/home link used in branded share fallback. |
| `UMAMI_BRAND_LOGO_URL` | small custom-image patch | HTTPS logo URL for the product shell and login screens. |
| `UMAMI_BRAND_FAVICON_URL` | small custom-image patch | HTTPS application favicon URL. |
| `UMAMI_BRAND_DOCS_URL` | small custom-image patch | Customer documentation link. |
| `UMAMI_BRAND_SUPPORT_URL` | small custom-image patch | Customer support link. |
| `UMAMI_APP_ORIGIN` | ingress, CSP review, smoke test | Canonical customer-facing analytics application origin. |
| `UMAMI_TRACKER_ORIGIN` | CDN/reverse proxy and tag generator | Canonical customer-facing tracker origin. |
| `UMAMI_TRACKER_SCRIPT_PATH` | CDN/reverse proxy and tag generator | Tracker path, beginning with `/`. The current CIG API path is `/api/v1/analytics/tracker.js`. |
| `UMAMI_COLLECT_PATH` | CDN/reverse proxy and collection route | Collection path, beginning with `/`. The current CIG API path is `/api/v1/analytics/collect`; keep it behind the control-plane origin policy. |
| `UMAMI_WEBSITE_FAVICON_SERVICE_URL` | upstream runtime (`FAVICON_URL`) | Icon service for tracked websites; it must contain the literal `{{domain}}` placeholder. |

`UMAMI_APP_ORIGIN` and `UMAMI_TRACKER_ORIGIN` must be distinct HTTPS origins in
production. The app origin serves the private operator data plane; the tracker
origin is intentionally public. Do not point either at a raw container port or
an Umami administration endpoint.

## Apply it

1. Build the immutable branded image using the pinned source commit and the
   limited patchset in [upstream-patchset.md](upstream-patchset.md). The stock
   `docker.umami.is` image cannot change product text, application logos,
   application favicon, or support/docs links through runtime variables.
2. Give the build only the six `UMAMI_BRAND_*` values. They are public UI
   values and become part of the image; never pass runtime secrets as build
   arguments.
3. Configure the public origins, TLS, host routing, cache policy, and security
   headers in the reverse proxy/CDN. The Compose stack stays loopback-only.
4. For the existing upstream runtime, map
   `UMAMI_WEBSITE_FAVICON_SERVICE_URL` to `FAVICON_URL`. Do not confuse this
   service with `UMAMI_BRAND_FAVICON_URL`.
5. Do not set `TRACKER_SCRIPT_NAME` or `COLLECT_API_ENDPOINT` in the hardened
   baseline merely because this file contains desired paths. Enabling those
   requires the immutable tracker artifact and public-ID translation work in
   checklist item 4.

For local syntax validation, create an operator-only branding file and run:

```bash
docker compose \
  --env-file /secure/path/umami.env \
  --env-file /secure/path/umami-branding.env \
  -f infrastructure/umami/compose.yaml config
```

This only validates Compose interpolation. Before promotion, verify all URLs
are HTTPS, use the intended DNS names, and serve their expected asset or page
without redirects to an administrative origin.

## Limits

Umami v3.4.0 provides `FAVICON_URL` for favicons of tracked websites and
`TRACKER_SCRIPT_NAME` for a tracker alias. It does not provide runtime settings
for product name, product logo, application favicon, or support/docs links.
Those UI-only changes are therefore contained in the documented build-time
patchset rather than hidden in deployment scripts or presented as native
upstream configuration.
