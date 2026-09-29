# Minimal Umami branding patchset and rebase procedure

## Baseline and boundary

This patchset is for upstream Umami `v3.4.0` at commit
`ec0ff50388c264ed8ce46f00967e92f7e71476ae`. It is a presentation-only custom
image delta. It must not change analytics schemas, migrations, API routes,
tracker behavior, authorization, team membership, telemetry, or licensing
notices. Keep the upstream MIT license and attribution in every derived-image
source distribution.

The pinned upstream image remains the default deployment baseline. Build this
patch only when customer-facing application branding is required. Do not keep a
long-lived application fork: retain the patch as a small, reviewable commit
series atop an unmodified upstream tag.

## Inputs

Read the six public `UMAMI_BRAND_*` values from
[branding.env.example](branding.env.example) at **build time**. Expose only
these public values to the Next.js client bundle:

```text
UMAMI_BRAND_NAME
UMAMI_BRAND_HOME_URL
UMAMI_BRAND_LOGO_URL
UMAMI_BRAND_FAVICON_URL
UMAMI_BRAND_DOCS_URL
UMAMI_BRAND_SUPPORT_URL
```

Do not read secrets or internal endpoints into `next.config.ts` `env`; those
values are bundled into client code by Next.js.

## Commit series

Keep these as three focused commits. Each commit has a narrow rebase surface.

1. **`brand: expose public build-time presentation settings`**

   - `next.config.ts`: read the six `UMAMI_BRAND_*` inputs with existing Umami
     defaults, then expose `brandName`, `brandHomeUrl`, `brandLogoUrl`,
     `brandFaviconUrl`, `brandDocsUrl`, and `brandSupportUrl` in the existing
     `env` object.
   - `src/lib/brand.ts` (new): export typed, defaulted accessors for these
     `process.env.brand*` values. Validate a configured URL as an absolute
     `https:` URL before rendering it; fall back to the existing upstream
     asset/link when it is absent or invalid.

2. **`brand: replace product shell identifiers`**

   - `src/app/layout.tsx` and `src/app/(main)/layout.tsx`: use the brand name
     in the metadata title template/default; use the branded favicon only when
     its validated URL is configured, otherwise retain every upstream local
     icon reference.
   - `src/components/svg/BrandLogo.tsx` (new): render the validated branded
     logo with a non-empty product-name `alt`, otherwise render the existing
     `Logo` component. Export it from `src/components/svg/index.ts`.
   - `src/app/(main)/SideNav.tsx`, `src/app/(main)/MobileNav.tsx`,
     `src/app/login/LoginForm.tsx`, and
     `src/app/login/two-factor/LoginTwoFactorPage.tsx`: replace only the
     existing `Logo`/hard-coded `umami` product presentation with `BrandLogo`
     and the brand name. Do not change authentication behavior, messages, or
     navigation paths.

3. **`brand: make customer help links configurable`**

   - `src/lib/constants.ts`: make `HOMEPAGE_URL` and `DOCS_URL` use the
     validated brand accessors while preserving upstream defaults; add a
     `SUPPORT_URL` accessor.
   - `src/components/input/UserButton.tsx`: show external documentation and
     support entries only when their configured URL is valid. Preserve the
     existing local cloud support route when no branded support URL is set.
   - `src/app/share/[slug]/[[...path]]/ShareBranding.tsx`: use branded
     home/name/logo only as the fallback when a share has no per-share
     white-label settings. Per-share white-label settings continue to win.

No patch changes the `FAVICON_URL` runtime setting. It is specifically the
favicons of sites being measured, not the favicon of the product interface.

## Rebase and release checklist

For every Umami upgrade, perform this before publishing a derived image:

```bash
git clone https://github.com/umami-software/umami.git /tmp/umami-upstream
git -C /tmp/umami-upstream checkout <verified-upstream-tag-or-commit>
git -C /tmp/umami-upstream cherry-pick <brand-commit-1> <brand-commit-2> <brand-commit-3>
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build:docker
```

Resolve conflicts by preserving upstream behavior unless the affected line is
one of the presentation seams listed above. Re-check all six configuration
values, run a browser smoke test for login, two-factor login, sidebar/mobile
navigation, metadata/favicon, docs/support links, and a share page with and
without per-share white-label settings. Then pin the resulting OCI digest in
deployment configuration and retain the upstream release/commit and patch
commit SHAs in the release record.

If the patch touches a route, Prisma schema, tracker, collector, API contract,
or authorization check, stop: it has exceeded this branding boundary and needs
separate architecture and security review.

## Verified upstream references

- [Umami v3.4.0 release](https://github.com/umami-software/umami/releases/tag/v3.4.0)
- [Umami environment variables](https://docs.umami.is/docs/environment-variables)
- [Upstream `next.config.ts` at v3.4.0](https://github.com/umami-software/umami/blob/v3.4.0/next.config.ts)
