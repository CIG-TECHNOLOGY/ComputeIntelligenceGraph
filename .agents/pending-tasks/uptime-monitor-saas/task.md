# Feature: Multi-Tenant Uptime Monitoring SaaS — `packages/monitor-ui`

**Status:** in_progress — EC2 running, bootstrap re-run pending after Secrets Manager apply
**Priority:** high
**Package:** `packages/monitor-ui` (new standalone CIG package, Next.js SaaS app)
**Infrastructure:** `packages/iac/modules/monitor-aws/` (Terraform module, complete)
**Domain:** `status.cig.technology` (operator) + `{slug}.status.cig.technology` per tenant (wildcard — zero tenant DNS config)
**Sellable service:** yes — whitelabel status pages + monitoring sold per org
**OpenStatus decision:** dropped — requires libSQL/Turso (no Postgres path), Resend API key (no SMTP), 5 separate containers (OOM on t3.micro), and `:latest`-only image tags

---

## Goal

Build and operate a **multi-tenant uptime and status-page monitoring service** as a CIG package that:

1. Lets CIG provision isolated tenants (Hashpass, Alternun, paying clients) from a super-admin UI
2. Gives each tenant a **public status page** at `{slug}.status.cig.technology` — no DNS config needed from the tenant; the wildcard DNS record covers everything
3. Monitors HTTP/HTTPS, TCP, DNS, SSL expiry, ping, and cron heartbeats
4. Sends alerts via existing SMTP (same server as Infisical)
5. Uses **Authentik OIDC** for authentication (same SSO as all other CIG services)
6. Lives on its **own dedicated EC2** — never co-located with Infisical

---

## Why Not OpenStatus

OpenStatus was researched and ruled out:
- **Requires Turso/libSQL** — no PostgreSQL support, no migration path from our stack
- **Requires Resend API key** for email (magic link login) — our SMTP setup doesn't work
- **5 separate containers** (dashboard, status page, API, workflows, libSQL) — OOM on t3.micro
- **Only `:latest` image tags** — cannot pin versions for stable production deploys
- **No super-admin UI** — would need to build one anyway

---

## Technology Stack

| Layer | Choice | Why |
|---|---|---|
| App | Custom Next.js 14 (`packages/monitor-ui`) | Full control, Postgres, Authentik SSO, existing patterns |
| Check engine | Gatus (Go, ~40 MB) | TCP, DNS, SSL expiry, ICMP, ping — fills HTTP-only gap |
| Database | PostgreSQL 16 | Same as every other CIG module |
| Auth | Authentik OIDC (`next-auth` v5) | Single SSO for all CIG services |
| TLS | Caddy + `caddy-dns/route53` | Wildcard certs for `*.status.cig.technology` via DNS-01 |
| Reverse proxy | Caddy directly (no ALB) | Saves $16/mo; handles custom tenant domains too |
| Email | Existing SMTP (`mail.xn--tlo-fla.com`) | Same creds as Infisical |
| ORM | Drizzle ORM + `postgres` driver | Type-safe, lightweight, matches rest of stack |

---

## Architecture

```
Internet
    │
    ▼  port 80/443
┌──────────────────────────────────────────────────────────────────┐
│  EC2 t3.micro (dedicated, us-east-2)                             │
│  EBS gp3 20 GB encrypted — SSM-managed, no SSH                  │
│                                                                  │
│  Route53 A:  status.cig.technology   → EIP                      │
│  Route53 A:  *.status.cig.technology → EIP  (wildcard!)         │
│  Any tenant CNAME:  status.hashpass.tech → status.cig.technology│
│                                                                  │
│  Docker Compose:                                                 │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ cig-caddy:local  :80/:443                               │     │
│  │   Wildcard TLS: *.status.cig.technology via DNS-01      │     │
│  │   Custom domains: per-block, HTTP-01                    │     │
│  │   Proxies all → app:3000                                │     │
│  │                                                         │     │
│  │ monitor-ui (Next.js)  :3000  (internal)                 │     │
│  │   /              → redirect (admin or /dashboard)       │     │
│  │   /login         → Authentik OIDC                       │     │
│  │   /admin         → super-admin: all orgs, provision     │     │
│  │   /dashboard     → tenant: their monitors + incidents   │     │
│  │   /status/[slug] → PUBLIC status page (no auth)         │     │
│  │   /api/admin/*   → admin REST (super-admin token)       │     │
│  │   /api/v1/*      → tenant REST (API key auth)           │     │
│  │                                                         │     │
│  │ gatus :8080  (internal — TCP/DNS/SSL/ICMP checks)       │     │
│  │   config synced by provision-gatus.mjs via SSM          │     │
│  │                                                         │     │
│  │ postgres:16 :5432 (internal)                            │     │
│  │ redis:7     :6379 (internal, session cache)             │     │
│  └─────────────────────────────────────────────────────────┘     │
│                                                                  │
│  Security group: inbound 80/443 from 0.0.0.0/0; outbound all   │
└──────────────────────────────────────────────────────────────────┘

Tenant routing (ALL handled by wildcard DNS + Caddy):
  hashpass.status.cig.technology → monitor-ui /status/hashpass
  alternun.status.cig.technology → monitor-ui /status/alternun
  status.hashpass.tech           → CNAME → EIP (premium custom domain)

No tenant ever needs to touch their DNS for the default tier.
```

---

## Package Structure

```
packages/monitor-ui/
├── package.json                    @cig/monitor-ui, version 0.1.0 ✓
├── tsconfig.json                   ✓
├── next.config.js                  standalone output ✓
├── tailwind.config.ts              ✓
├── postcss.config.js               ✓
├── docker/
│   └── Dockerfile                  multi-stage, standalone output ✓
├── src/
│   ├── app/
│   │   ├── layout.tsx              ✓
│   │   ├── page.tsx                redirect logic ✓
│   │   ├── globals.css             ✓
│   │   ├── login/page.tsx          Authentik OIDC button ✓
│   │   ├── (admin)/admin/
│   │   │   ├── page.tsx            all orgs table ✓
│   │   │   └── orgs/
│   │   │       ├── new/page.tsx    create org form ✓
│   │   │       └── [slug]/page.tsx org detail — TODO
│   │   ├── (tenant)/dashboard/     tenant monitor list — TODO
│   │   ├── status/[tenant]/
│   │   │   └── page.tsx            public status page ✓
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  ✓
│   │       ├── admin/orgs/route.ts          GET + POST ✓
│   │       └── v1/deployments/route.ts      CI/CD marker ✓
│   ├── lib/
│   │   ├── auth.ts                 NextAuth + Authentik config ✓
│   │   └── db/
│   │       ├── index.ts            Drizzle + postgres client ✓
│   │       ├── schema.ts           full multi-tenant schema ✓
│   │       └── drizzle.config.ts   ✓
│   └── components/                 shared UI — TODO
└── scripts/
    ├── provision-org.mjs           create tenant via API + sync Gatus ✓
    ├── provision-gatus.mjs         sync Gatus config from DB via SSM ✓
    └── patch-env.mjs               SSM live-patch .env on EC2 ✓

packages/iac/modules/monitor-aws/
├── main.tf          EC2 t3.micro + EIP + SG + IAM + Route53 wildcard ✓
├── variables.tf     domain, smtp, authentik, image tags ✓
├── secrets.tf       db_password + nextauth_secret → Secrets Manager ✓
├── outputs.tf       monitor_url, instance_id, elastic_ip, etc. ✓
└── user_data.sh.tftpl  bootstrap: swap, Docker, xcaddy, secrets, compose ✓

packages/iac/environments/lean-prod/
├── main.tf          + module "monitor_host" block ✓
└── variables.tf     + monitor_domain, monitor_ui_image_tag, gatus_image_tag, etc. ✓
```

---

## AWS Resources

| Resource | Spec | Est. cost/mo |
|---|---|---|
| EC2 t3.micro | 1 vCPU, 1 GB RAM + 2 GB swap | ~$8.00 |
| EBS gp3 20 GB | encrypted | ~$1.60 |
| EIP | attached (no charge while attached) | $0.00 |
| Route53 A records × 2 | apex + wildcard | ~$0.50 |
| S3 backup bucket | 30-day lifecycle | ~$0.10 |
| Let's Encrypt wildcard cert | DNS-01 via Caddy | $0.00 |
| **Total** | | **~$10/mo** |

---

## Database Schema (src/lib/db/schema.ts ✓)

- **organizations** — slug, name, plan, customDomain, statusPageEnabled
- **users** — email, name, isSuperAdmin
- **orgMembers** — orgId, userId, role (owner/admin/member)
- **monitors** — orgId, name, type (http/tcp/dns/ssl/ping/heartbeat), target, intervalSeconds
- **checkResults** — monitorId, status (up/down/degraded), responseTimeMs, checkedAt
- **incidents** — orgId, monitorId, title, status, startedAt, resolvedAt
- **incidentUpdates** — incidentId, status, message
- **alertChannels** — orgId, type (email/slack/webhook), config (jsonb)
- **deployments** — orgId, version, environment, deployedAt
- **apiKeys** — orgId, name, keyHash (sha256), expiresAt

---

## Wildcard DNS + TLS

```
Route53: *.status.cig.technology A → EIP  (one record, all tenants covered)

Caddyfile:
  *.status.cig.technology {
    tls { dns route53 { max_retries 3 } }  ← DNS-01, EC2 IAM role handles auth
    reverse_proxy app:3000
  }

EC2 IAM has: route53:ChangeResourceRecordSets, ListResourceRecordSets, GetChange

Result: ONE wildcard cert. CIG provisions new tenants with zero DNS interaction.
Custom domain (premium): tenant CNAMEs status.hashpass.tech → status.cig.technology
```

---

## Completed Tasks ✓

- [x] Terraform module `packages/iac/modules/monitor-aws/` (main, variables, secrets, outputs, user_data)
- [x] Wired into `lean-prod` (module block, variables, prod.tfvars)
- [x] Database schema — full multi-tenant Drizzle + Postgres (`schema.ts`)
- [x] Auth — NextAuth v5 + Authentik OIDC, `isSuperAdmin` from `cig-admins` group claim
- [x] Super-admin UI — all orgs table (`/admin`), create org form (`/admin/orgs/new`), org detail page (`/admin/orgs/[slug]`)
- [x] Admin layouts with nav + sign-out
- [x] Tenant dashboard — monitor list, summary cards, recent incidents (`/dashboard`)
- [x] Add monitor form — HTTP/TCP/DNS/SSL/ICMP/heartbeat types (`/dashboard/monitors/new`)
- [x] Incidents list page (`/dashboard/incidents`)
- [x] Alert channels UI — add email/Slack/webhook channels (`/dashboard/alerts`)
- [x] SMTP alert dispatcher (`src/lib/alerts.ts`) — fires on DOWN/UP transition
- [x] API routes — `GET+POST /api/admin/orgs`, `GET+POST /api/v1/monitors`, `GET+POST /api/v1/alerts`, `POST /api/v1/deployments`
- [x] HTTP check runner — BullMQ worker, concurrency 20, auto-reschedule, incident create/resolve, alert dispatch (`src/workers/check-runner.ts`)
- [x] `monitor-worker` container added to docker-compose in `user_data.sh.tftpl`
- [x] Dockerfile — multi-stage, standalone Next.js + compiled worker.js (`packages/monitor-ui/docker/Dockerfile`)
- [x] GitHub Actions CI — `.github/workflows/monitor-ui-publish.yml` — pushes to `ghcr.io/cig-technology/monitor-ui` using `GHCR_TOKEN_WRITE` PAT
- [x] `provision-org.mjs` — create tenant via API + call Gatus sync
- [x] `provision-gatus.mjs` — build Gatus YAML from DB monitors + push via SSM + restart Gatus
- [x] `patch-env.mjs` — SSM live-patch `.env` + recreate app container
- [x] `migrate.mjs` — SSM migration runner (`drizzle-kit migrate` inside running container)
- [x] Root `package.json` scripts — `monitor:provision:org`, `monitor:gatus:sync`, `monitor:patch:env`, `monitor:db:migrate`
- [x] Authentik OIDC provider registered — provider id=3, `cig-admins` group, `cig-monitor` application
- [x] Docker image published — `ghcr.io/cig-technology/monitor-ui:latest` (sha-867fc9c)
- [x] EC2 provisioned — `i-05cfeb88bfe32e14e` @ EIP `3.17.211.229`
- [x] Route53 wildcard DNS — `*.status.cig.technology` + `status.cig.technology` → EIP
- [x] EBS upgraded to 80 GB in-place (live `modify-volume` + `xfs_growfs`) — 72 GB free
- [x] Bootstrap fixed — replaced host xcaddy build with Docker multi-stage Caddy build (no disk exhaustion)
- [x] Secrets Manager refactor — SMTP password, Authentik client ID/secret, GHCR PAT moved to Secrets Manager; user_data contains only secret IDs; no plaintext credentials in EC2 metadata or Terraform state

---

## Go-Live Runbook (ordered, one-liner per step)

Everything below is a single command — no manual UI clicks required.

### Step 1 — Register OIDC app in Authentik (get client ID/secret)
```bash
# Requires AUTHENTIK_BOOTSTRAP_TOKEN in .env
# (Create at https://auth.cig.technology/if/admin/#/core/tokens)
pnpm monitor:provision:authentik
# → Prints client_id and client_secret
# → Copy both into packages/iac/environments/lean-prod/secrets.auto.tfvars
# → Also adds you to cig-admins group manually in Authentik UI (one-time)
```

### Step 2 — Build and push the Docker image
```bash
git add packages/monitor-ui && git commit -m "feat(monitor): initial monitor-ui SaaS app"
git push origin main && git push upstream main
# GitHub Actions (.github/workflows/monitor-ui-publish.yml) builds and pushes
# ghcr.io/cig-technology/monitor-ui:sha-<hash> automatically
# Update prod.tfvars with the published sha tag after the action completes
```

### Step 3 — Terraform apply
```bash
make apply ENV=lean-prod
# ✅ DONE — EC2 i-05cfeb88bfe32e14e @ 3.17.211.229
# This must be re-run after the Secrets Manager refactor to create the 4 new secrets
# and update the IAM role policy (additive — no EC2 replacement)
```

### Step 4 — Capture outputs into .env
```bash
pnpm monitor:capture:outputs
# ✅ DONE — .env has MONITOR_INSTANCE_ID, MONITOR_URL, MONITOR_ELASTIC_IP
```

### Step 5 — Re-run bootstrap via SSM (bootstrap previously failed — xcaddy disk exhaustion, now fixed)
```bash
# ⏳ PENDING: after `make apply ENV=lean-prod` creates the Secrets Manager secrets:
# The rendered bootstrap script will contain only secret IDs (no plaintext creds).
# Upload to private S3 bucket and run via SSM:
#   aws s3 cp /tmp/bootstrap-clean.sh s3://cig-monitor-backups-cf08cd0d/bootstrap.sh
#   aws ssm send-command --document-name AWS-RunShellScript \
#     --parameters 'commands=["aws s3 cp s3://cig-monitor-backups-cf08cd0d/bootstrap.sh /tmp/bootstrap.sh && bash /tmp/bootstrap.sh"]'
# Monitor: aws ssm get-command-invocation ...
# Expect: "Monitor host bootstrap complete" in /var/log/monitor-init.log
```

### Step 6 — Run DB migrations
```bash
pnpm monitor:db:migrate
# SSMs into EC2, runs drizzle-kit migrate inside the app container
```

### Step 7 — Register Authentik OIDC (already done in Step 1)
```bash
# secrets.auto.tfvars already has the client_id + client_secret
# Run terraform apply again to inject them into the EC2 .env:
make apply ENV=lean-prod   # idempotent, just updates .env on EC2 via user_data patch
# OR use the SSM patch directly:
pnpm monitor:patch:env
```

### Step 8 — Provision tenants
```bash
pnpm monitor:provision:org -- --name CIG --slug cig
pnpm monitor:provision:org -- --name Hashpass --slug hashpass
pnpm monitor:provision:org -- --name Alternun --slug alternun
# Verify: https://hashpass.status.cig.technology
```

### Step 9 — Store API key + enable CI/CD markers
```bash
# 1. Log into https://status.cig.technology as CIG admin
# 2. Admin → CIG org → API Keys → Create → copy key
# 3. Store in Infisical cig-production project as MONITOR_API_KEY
# 4. Add MONITOR_URL + MONITOR_API_KEY to .env
# 5. release.sh already has the deployment marker — it fires automatically
```

### Step 10 — Backup smoke test
```bash
# Trigger manually:
BUCKET=$(aws ssm get-parameter --name /monitor/backup-bucket --query Parameter.Value --output text 2>/dev/null || echo "cig-monitor-backups-*")
docker exec monitor-db pg_dump -U postgres monitor | gzip | aws s3 cp - s3://$BUCKET/smoke-test.sql.gz
aws s3 ls s3://$BUCKET/
```

---

## Onboarding a New Paying Client

```bash
pnpm monitor:provision:org -- --name "Acme Corp" --slug acme
# Optional custom domain (premium):
pnpm monitor:provision:org -- --name "Acme Corp" --slug acme --domain status.acme.com
# → Script prints CNAME instruction: status.acme.com CNAME status.cig.technology
# → Caddy auto-certs within ~60s of first DNS-resolved request
```

---

## Reference

- Terraform module: `packages/iac/modules/monitor-aws/`
- Reference provisioning script: `scripts/provision-hashpass-infisical.mjs`
- Reference SSM patch: `scripts/patch-infisical-smtp.mjs`
- Drizzle ORM: https://orm.drizzle.team
- NextAuth v5 Authentik: https://authjs.dev/getting-started/providers/authentik
- Caddy wildcard DNS-01: https://caddyserver.com/docs/automatic-https
- caddy-dns/route53: https://github.com/caddy-dns/route53
- Gatus: https://github.com/TwiN/gatus
- AWS account: `520900722378`, region `us-east-2`
- Existing SMTP: `mail.xn--tlo-fla.com:587`, `notifications@cig.technology`
