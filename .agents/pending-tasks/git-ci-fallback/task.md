# Feature: Multi-Tenant Git/CI Fallback Hub — `packages/git-ci`

**Status:** pending — not started
**Priority:** high (delegated from Hashpass, which becomes the first paying/using tenant)
**Package:** `packages/git-ci` (new standalone CIG package, provisioning scripts + relay service)
**Infrastructure:** `packages/iac/modules/git-ci-aws/` (Terraform module, to build)
**Domain:** `ci.cig.technology` (Forgejo instance) — tenants are **Forgejo organizations**, not subdomains (Forgejo already namespaces by `ci.cig.technology/<org>/<repo>`, no wildcard DNS needed the way `monitor-aws` needed one)
**Sellable service:** yes — CI/CD outage-resilience as a CIG-hosted service, sold per tenant org alongside the existing multi-tenant uptime-monitor offering
**Originating incident:** a multi-hour GitHub-wide platform outage on 2026-08-06 (Hashpass repo) completely blocked releases — PR checks never started, workflow dispatches returned `HTTP 500`, and Hashpass's own self-hosted GitHub Actions runner was useless because it's *dispatched by GitHub*, not independent of it.

---

## Goal

Build and operate a **multi-tenant self-hosted CI fallback service** as a CIG package that:

1. Gives CIG's own repos **and any client tenant** (Hashpass first, then Alternun, LSTS, etc.) a genuinely GitHub-independent CI path for when GitHub Actions itself has a platform outage — not just a self-hosted runner (those still depend on GitHub's control plane to dispatch work), but a fully separate git host + Actions-compatible runner.
2. Lets CIG provision new tenants from a simple script (`provision-tenant.mjs`, matching the `monitor-ui` package's `provision-org.mjs` pattern): creates a Forgejo organization, sets up a one-way push-mirror from the tenant's GitHub repo, issues a scoped relay token.
3. Runs the two checks CIG considers release-blocking as the default tenant onboarding package (secret scan via gitleaks, coverage/test-run), plus a CodeQL-equivalent (Semgrep OSS) — each tenant can add more of their own `.forgejo/workflows/*.yml` beyond the default set once onboarded.
4. Relays each check's result back to the tenant's **own** GitHub repo as a named check-run via the GitHub Checks API, so a tenant's existing branch-protection rules are satisfied without a manual `--admin` merge bypass, even while GitHub Actions itself is down.
5. Uses **Authentik OIDC** for CIG staff/admin access to the Forgejo instance (same SSO as every other CIG service) — tenant repos themselves are reached via push-mirror + relay tokens, tenants never need their own Forgejo login for the default (mirror-only) tier.
6. Lives on its own dedicated EC2 (git host) + an on-demand-started runner EC2, following the same "dedicated host, no shared VPC/ALB, Caddy handles TLS" minimal-always-on-infra pattern as `monitor-aws` — **never co-located with Infisical or the monitor host.**

---

## Why This Is a CIG Package, Not a Hashpass One

Originally scoped inside the Hashpass repo as a single-tenant fallback for
Hashpass's own GitHub Actions outage exposure. Reframed as a shared CIG
package because:

- The actual failure mode (GitHub's control plane, not runner capacity)
  affects every CIG client equally, not just Hashpass — building it once,
  multi-tenant, amortizes the ~$20-25/mo single-tenant cost across every
  org that onboards instead of every tenant standing up its own instance.
- CIG already runs exactly this shape of shared multi-tenant service
  (`monitor-ui` / `status.cig.technology`) — same operator model (CIG
  provisions, tenant relies on it, CIG can sell it), same infra pattern
  (dedicated EC2, Caddy, Authentik SSO, Infisical secrets), same tenant
  roster (Hashpass, Alternun, LSTS as they onboard).
- Hashpass becomes the **first tenant to use it**, not the owner of the
  underlying infrastructure — matches how Hashpass already only
  *consumes* `status.cig.technology`, it doesn't run its own copy.

## Why Not OneDev / Gitea (platform choice, still applies here)

- **Forgejo** (chosen): CI workflow syntax is near-identical to GitHub
  Actions (`on:`/`jobs:`/`steps:`/`uses:`), so tenant workflow files
  mostly copy-adapt rather than rewrite from scratch. Native multi-org
  multi-repo support out of the box — tenant isolation is just "each
  tenant gets their own Forgejo organization," no custom multi-tenant app
  logic needed (unlike `monitor-ui`, which had to build its own org/tenant
  model from scratch because Gatus/status-page tooling has none).
- **Gitea**: same Actions engine Forgejo forked from, functionally
  near-equivalent — ruled out only on governance grounds (for-profit-backed
  since the fork, vs. Forgejo's community non-profit model). Legitimate
  fallback choice if that tradeoff is reconsidered later; swapping is low
  cost since the runner/workflow-syntax work is nearly identical either way.
- **OneDev**: own job-spec format, not a GitHub Actions port — every
  tenant's ported check would need hand-rewriting instead of copy-adapting,
  and its JVM footprint is heavier for a service meant to sit mostly idle
  between real GitHub outages.

---

## Technology Stack

| Layer | Choice | Why |
|---|---|---|
| Git host + CI | Forgejo (self-hosted) + Forgejo Actions | GitHub-Actions-compatible workflow syntax, native multi-org tenancy, independent control plane |
| Runner | `forgejo-runner` (Go binary) | Actions-compatible, on-demand start/stop like the existing Hashpass `aws_pipeline_ec2_worker`/mobile-release-runner pattern |
| Reverse proxy / TLS | Caddy | Same as `monitor-aws` — no ALB, saves ~$16/mo, handles Let's Encrypt automatically |
| Auth (CIG staff) | Authentik OIDC | Single SSO for all CIG services, same as every other package |
| Secrets | Infisical (`secrets.cig.technology`) | **Mandatory per CLAUDE.md's 2026-07-03 mandate** — no new AWS Secrets Manager secrets; store one Infisical service token per EC2, `infisical run` for everything else |
| Relay | Small Node script, called from each Forgejo workflow's final step | Posts check-run results to the tenant's own GitHub repo via `POST /repos/{tenant}/{repo}/check-runs`, using a per-tenant fine-grained PAT |
| Cross-repo mirroring | Native git push-mirror (GitHub → Forgejo, one-way) per tenant repo | No polling, no extra infra; GitHub's own "Push mirror" repo setting if reachable, otherwise a tiny `on: push` GitHub Actions step doing `git push --mirror` |

---

## Architecture

```
Tenant's GitHub repo (Hashpass, Alternun, LSTS, ... — source of truth stays here)
    │  push-mirror (one-way, tenant's GitHub -> CIG Forgejo, per-tenant)
    ▼
┌──────────────────────────────────────────────────────────────────┐
│  EC2 t3.small (dedicated, us-east-2, aws-cig profile)             │
│  Route53 A: ci.cig.technology → EIP  (single record — Forgejo    │
│  namespaces tenants by org/repo path, no wildcard subdomain needed)│
│                                                                    │
│  Docker Compose:                                                  │
│  ┌────────────────────────────────────────────────────────┐       │
│  │ cig-caddy:local  :80/:443 → forgejo:3000                │       │
│  │   Auth via Authentik OIDC (CIG staff/admin only)         │       │
│  │                                                          │       │
│  │ forgejo :3000 (internal)                                 │       │
│  │   ci.cig.technology/hashpass/hashpass.tech                │       │
│  │   ci.cig.technology/alternun/<repo>                       │       │
│  │   ci.cig.technology/lsts/<repo>                           │       │
│  │   (one org per tenant — native isolation, per-org         │       │
│  │    secrets store, per-org runner labels if needed)        │       │
│  │                                                          │       │
│  │ postgres:16 :5432 (internal, Forgejo's own DB)            │       │
│  └────────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼  on-demand start (idle-stop pattern, same as monitor-worker/
    │  Hashpass's aws_pipeline_ec2_worker), triggered by mirrored push
┌──────────────────────────────────────────────────────────────────┐
│  EC2 (runner, on-demand, target tenant's default workflows)       │
│  forgejo-runner registered against ci.cig.technology              │
│  runs: secret-scan (gitleaks), coverage/tests, Semgrep             │
│  final step of each workflow → relay-check-to-github.mjs          │
└──────────────────────────────────────────────────────────────────┘
    │  POST /repos/{tenant-org}/{repo}/check-runs (tenant-scoped PAT)
    ▼
Tenant's GitHub repo — check-runs appear under the SAME context names
the tenant's own branch-protection rules expect → tenant merges normally,
even while GitHub Actions itself is still down.
```

---

## Package Structure (mirrors `packages/monitor-ui`'s shape)

```
packages/git-ci/
├── package.json                     @cig/git-ci
├── scripts/
│   ├── provision-tenant.mjs         create Forgejo org + configure push-mirror + issue relay PAT
│   ├── relay-check-to-github.mjs    POST check-run result to a tenant's GitHub repo
│   ├── patch-env.mjs                SSM live-patch .env on the Forgejo EC2 (matches monitor-ui's pattern)
│   └── migrate-workflows.mjs        copy/adapt a tenant's .github/workflows/*.yml into .forgejo/workflows/*.yml for the default check set
└── templates/
    ├── secret-scan.forgejo.yml      default tenant onboarding workflow
    ├── coverage.forgejo.yml
    └── semgrep.forgejo.yml

packages/iac/modules/git-ci-aws/
├── main.tf           EC2 (Forgejo host) + EIP + SG + IAM + Route53 A record
├── runner.tf          on-demand runner EC2 + idle-stop watchdog (forked from Hashpass's aws_github_actions_runner module shape, adapted for forgejo-runner register instead of GitHub's config.sh)
├── variables.tf       domain, authentik config, infisical service token id
├── secrets.tf          ONE Infisical service-token secret id only (per the 2026-07-03 mandate — no plaintext creds, no per-secret Secrets Manager entries)
├── outputs.tf
└── user_data.sh.tftpl  bootstrap: Docker, Caddy, Forgejo, infisical CLI, docker-compose up

packages/iac/environments/lean-prod/
├── main.tf            + module "git_ci_host" block (same shape as module "monitor_host")
└── variables.tf        + git_ci_domain, git_ci forgejo image tag, etc.
```

---

## AWS Resources (multi-tenant — cost does NOT scale per-tenant)

| Resource | Spec | Est. cost/mo |
|---|---|---|
| EC2 t3.small (Forgejo host, always-on) | 2 GB RAM — Forgejo's documented practical minimum | ~$15.00 |
| EC2 runner (on-demand, idle-stop) | `t3.medium`, only running during an actual GitHub outage or a scheduled dry-run — a few hours/month regardless of tenant count | ~$2-5.00 |
| EBS gp3 30 GB | Forgejo host (all tenants' mirrored repo data) | ~$2.40 |
| Route53 A record ×1 | single record — no wildcard needed, Forgejo namespaces by org path | ~$0.25 |
| Data transfer | push-mirror deltas across all tenants, low volume | ~$1-3.00 |
| Infisical | already-provisioned shared CIG instance — marginal cost ~$0 | $0.00 |
| **Total (steady state, any tenant count)** | | **~$20-25/mo** |

The whole design point of putting this in CIG's shared infra instead of
each tenant standing up their own copy: **marginal cost per additional
tenant is ~$0** (an org creation + a bit more EBS for their mirrored repo
data) — the fixed EC2/EBS/Route53 cost above is paid once by CIG and
amortized across Hashpass, Alternun, LSTS, and future tenants.

---

## Multi-Tenant Isolation Model

- **Repo/org isolation**: one Forgejo organization per tenant
  (`ci.cig.technology/hashpass/`, `/alternun/`, `/lsts/`) — Forgejo's
  built-in RBAC keeps tenants from seeing each other's orgs/repos/secrets.
- **Secrets isolation**: Forgejo supports secrets at the org level — each
  tenant's `FORGEJO_RELAY_TOKEN` (their own GitHub PAT, scoped only to
  their own repo's `check-runs` write) lives in **their own org's**
  secrets store, never shared across tenants.
- **Runner isolation**: default tier shares the single on-demand runner
  pool (acceptable — each tenant only ever runs *their own* already-trusted
  code, same trust model as GitHub's own shared-runner pool). A premium
  tier (dedicated runner per tenant) is a future upsell, not needed for v1.
- **CIG staff access**: Authentik OIDC gates the Forgejo admin UI itself;
  regular tenant onboarding never requires a tenant to log into Forgejo at
  all — mirror + relay token is enough for the default flow, matching
  `monitor-ui`'s "zero tenant DNS config needed" philosophy applied to
  "zero tenant Forgejo account needed."

---

## Onboarding a New Tenant

```bash
pnpm git-ci:provision:tenant -- --name Hashpass --slug hashpass --github-repo hashpass-tech/hashpass.tech
# → Creates Forgejo org "hashpass"
# → Configures push-mirror from github.com/hashpass-tech/hashpass.tech
# → Prompts for a tenant-supplied fine-grained GitHub PAT (Checks: write, that repo only)
#   stored as an org-level Forgejo secret FORGEJO_RELAY_TOKEN
# → Copies templates/*.forgejo.yml into the mirrored repo's .forgejo/workflows/
#   (tenant can add more of their own beyond the default set post-onboarding)
# → Prints verification URL: https://ci.cig.technology/hashpass/hashpass.tech
```

---

## Task Checklist (adapted from the original single-tenant Hashpass plan)

### Phase 0 — Shared operator runbook
- [ ] `docs/git-ci-outage-runbook.md`: how CIG staff verify GitHub's status,
      confirm a tenant's mirror picked up a push, and (for tenants not yet
      onboarded) the manual `--admin` merge fallback tenants can use on
      their own repo in the meantime.

### Phase 1 — Forgejo instance + first mirror (Hashpass, as first tenant)
- [ ] `packages/iac/modules/git-ci-aws/`: EC2, Caddy, Route53 A record,
      Forgejo via Docker Compose, Infisical service-token bootstrap only.
- [ ] Wire into `packages/iac/environments/lean-prod/main.tf` as
      `module "git_ci_host"`, matching `module "monitor_host"`'s shape.
- [ ] `pnpm git-ci:provision:tenant` for Hashpass (first real tenant),
      verify push-mirror latency end-to-end with a real commit.

### Phase 2 — Forgejo Actions runner
- [ ] Fork Hashpass's own `aws_github_actions_runner` Terraform module
      pattern into `runner.tf` here, swap GitHub's `config.sh` registration
      for `forgejo-runner register`.
- [ ] Default tenant onboarding templates: `secret-scan.forgejo.yml`,
      `coverage.forgejo.yml`, `semgrep.forgejo.yml` (Semgrep as the
      CodeQL-equivalent — CodeQL itself is GitHub-proprietary, document
      this as a known, accepted gap in the runbook).
- [ ] Runner AWS access via the EC2's own IAM instance profile (no stored
      credentials), matching `aws_pipeline_ec2_worker` precedent.

### Phase 3 — GitHub Checks API relay (per-tenant)
- [ ] `scripts/relay-check-to-github.mjs`: generic, takes tenant org slug
      + check name + conclusion + details-url, resolves that tenant's own
      `FORGEJO_RELAY_TOKEN` from their org's Forgejo secrets, posts to
      **that tenant's own GitHub repo**.
- [ ] `scripts/provision-tenant.mjs`: the onboarding flow described above.
- [ ] Document the trust-boundary tradeoff per tenant: each
      `FORGEJO_RELAY_TOKEN` can post passing checks only for its own
      tenant's repo (scoped PAT) — no cross-tenant blast radius by
      construction, unlike a single shared relay credential would have.

### Phase 4 — Explicitly deferred / out of scope
- [ ] Document: full pipeline mirroring (e.g. porting a tenant's mobile/
      infra-deploy release workflows) is a per-tenant premium add-on, not
      part of the default onboarding package — default tier covers only
      the secret-scan/coverage/Semgrep triad.
- [ ] Document: dedicated per-tenant runners (isolation upsell) deferred
      until there's real demand beyond the shared-pool trust model.

### Phase 5 — Testing & multi-tenant operational runbook
- [ ] Dry-run failover test on the Hashpass tenant org specifically (first
      real tenant): simulate a GitHub outage, confirm relay-posted
      check-runs let a normal `gh pr merge` succeed on Hashpass's repo.
- [ ] Onboard a second tenant (Alternun or LSTS, whichever is ready first)
      to validate the multi-tenant isolation model isn't just
      theoretical — confirm their org, secrets, and mirror are fully
      independent of Hashpass's.
- [ ] Quarterly dry-run cadence added to CIG's existing ops calendar,
      covering all onboarded tenants, not just Hashpass.

---

## Reference

- Sibling multi-tenant CIG service (same infra pattern, same tenant
  roster): `packages/monitor-ui/`,
  `.agents/pending-tasks/uptime-monitor-saas/task.md`
- Originating incident + single-tenant research this was distilled from:
  Hashpass repo, `apps/docs/docs/infra/` (GitHub outage on 2026-08-06,
  workflow inventory, branch-protection/coverage-gate facts)
- Forgejo Actions docs: https://forgejo.org/docs/latest/user/actions/
- `forgejo-runner`: https://code.forgejo.org/forgejo/runner
- Infisical secret-management mandate: [CLAUDE.md](../../../CLAUDE.md#secret-management--infisical-first)
- AWS account: `520900722378` (`aws-cig` profile), region `us-east-2`
- Authentik SSO: same instance as every other CIG service (`auth.cig.technology`)
