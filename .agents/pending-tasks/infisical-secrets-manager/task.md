# Feature: Replace AWS Secrets Manager with Self-Hosted Infisical

> **POLICY (2026-07-03):** For all new internal secrets, prefer the CIG Infisical instance at `secrets.cig.technology` over AWS Secrets Manager. AWS Secrets Manager is only acceptable as a bootstrap vehicle (e.g. storing an Infisical service token so an EC2 can authenticate on first boot). Any new module or script that would create a Secrets Manager secret should instead fetch from Infisical.

**Status:** in_progress
**Priority:** high — NOW ARCHITECTURAL MANDATE, not just cost saving
**Architecture:** Standalone EC2 (dedicated Infisical host, NOT co-located with Authentik)
**AWS cost eliminated:** ~$6.71/month (12.3% of total spend)
**Decision:** Infisical (MIT license) over HashiCorp Vault (BSL — prohibits SaaS resale)
**License:** MIT — enables offering/selling as a multi-tenant SaaS product

---

## Goal

Self-host Infisical on a **dedicated standalone EC2 instance** (following the `authentik-aws` module pattern) to:
1. Eliminate AWS Secrets Manager costs entirely
2. Create a **multi-tenant secrets platform** with isolated workspaces for CIG, alternun, hashpass, and third-party clients
3. Provide **institutional-grade compliance security** (encrypted EBS, VPC isolation, IAM least-privilege, SSM access, audit logging, automated backups)
4. Maintain MIT-licensed codebase so the service can be offered/sold as a product

---

## Architecture

```
┌───────────────────────────────────────────────────────────┐
│  Route53: secrets.cig.technology ─── ALB (HTTPS:443)     │
│                                          │                │
│                              Security Group (ALB→EC2)     │
│                                          │                │
│  ┌──────────────────────────────────────────────────┐     │
│  │  EC2 t3.small (dedicated Infisical host)         │     │
│  │  ├── Docker Compose: Infisical server            │     │
│  │  ├── Docker Compose: PostgreSQL 16               │     │
│  │  ├── Docker Compose: Redis 7                     │     │
│  │  ├── Encrypted EBS root volume (gp3, 30GB)       │     │
│  │  └── SSM managed (no SSH required)               │     │
│  │                                                   │     │
│  │  EIP (elastic IP for DNS/A record)               │     │
│  └──────────────────────────────────────────────────┘     │
│                                                           │
│  ┌──────────── Multi-Tenant Workspaces ────────────┐      │
│  │  cig-production   │  alternun-production        │      │
│  │  hashpass-prod.   │  third-party-client-*       │      │
│  └─────────────────────────────────────────────────┘      │
│                                                           │
│  Backup: daily pg_dump → S3 (encrypted bucket)            │
│  Audit: CloudTrail + Infisical audit log → S3 / CWL       │
└───────────────────────────────────────────────────────────┘
```

Infrastructure follows the **exact `authentik-aws` module pattern**:
- Default VPC (no custom VPC cost)
- ALB with ACM (DNS-validated via Route53)
- EC2 t3.small with Amazon Linux 2023
- EBS root volume encrypted (gp3, 30GB)
- IAM role with SSM + minimal secrets access
- Elastic IP
- Route53 A-record alias to ALB

---

## Requirements

### Infrastructure
- [x] **Architecture decision**: Dedicated standalone EC2 (new `infisical-aws` module modeled on `packages/iac/modules/authentik-aws/`)
- [x] Terraform module at `packages/iac/modules/infisical-aws/` with ALB + ACM + EC2 + EIP + Route53
- [ ] Infisical accessible at private internal URL `secrets.internal.cig.lat` and optionally public `secrets.cig.technology` for external clients
- [ ] TLS terminated via ACM-backed ALB (not self-signed or Let's Encrypt on instance)
- [ ] Local PostgreSQL 16 via Docker Compose (co-located on the Infisical EC2 for simplicity and cost)
- [ ] Local Redis 7 via Docker Compose (for session caching and task queues)
- [ ] Security group: port 443 inbound from VPC CIDR only (internal) or 0.0.0.0/0 (external client access)
- [ ] Swap file (2 GB) to prevent OOM on t3.small — same pattern as `authentik-aws`
- [ ] Store Infisical `ENCRYPTION_KEY` and `AUTH_SECRET` in AWS Secrets Manager during transition, rotate to Infisical-native after cut-over

### Security (Compliance / Institutional Grade)
- [ ] **Encrypted EBS**: root volume with `encrypted = true` (gp3)
- [ ] **IAM least-privilege**: EC2 role with scoped policies (SSM + minimal secrets read), no admin permissions
- [ ] **SSM-only access**: No SSH bastion; instance managed via AWS Systems Manager Session Manager
- [ ] **VPC isolation**: Default VPC security groups scoped to ALB→EC2 traffic only
- [ ] **Audit logging**: CloudTrail on management events + Infisical audit log export to S3/CloudWatch Logs
- [ ] **Automated backups**: Daily `pg_dump` to S3 bucket (separate encrypted bucket), 30-day retention
- [ ] **Secret rotation plan**: Bootstrap secrets (ENCRYPTION_KEY, AUTH_SECRET) rotated post-deployment

### Multi-Tenancy
- [ ] Separate Infisical workspaces per project:
  - `cig-production` — main CIG platform
  - `alternun-production` — alternun project secrets
  - `hashpass-production` — hashpass project secrets
  - `client-<name>` — third-party client workspaces (created on-demand)
- [ ] Machine identities per workspace for ECS/GitHub integration
- [ ] RBAC: workspace-level roles (admin, developer, viewer) with no cross-workspace access
- [ ] Authentik OIDC integration for admin SSO into Infisical dashboard (future: SAML for enterprise clients)

### Migration
- [ ] All secrets currently in AWS Secrets Manager migrated to Infisical
- [ ] ECS task definitions updated to pull secrets from Infisical instead of `valueFrom: secretsmanager`
- [ ] GitHub Actions CI/CD updated to use Infisical CLI or SDK instead of `aws secretsmanager get-secret-value`
- [ ] Migration script: reads from AWS Secrets Manager → pushes to Infisical via `infisical secrets set`
- [ ] Rollback plan: AWS Secrets Manager secrets preserved for 30-day recovery window

---

## Tasks

### 0. Create Infisical Terraform Module
- [x] Create `packages/iac/modules/infisical-aws/` copying the `authentik-aws` structure:
  - [x] `main.tf` — EC2 t3.small + ALB + ACM + EIP + Security Groups + IAM + Route53
  - [x] `variables.tf` — domain, region, route53_zone_id, ssh_public_key, smtp_*, tags + infisical_image_tag, multi_tenant flag
  - [x] `outputs.tf` — `infisical_url`, `alb_dns_name`, `instance_id`, `elastic_ip`, bootstrap secret ARNs
  - [x] `secrets.tf` — random_password for ENCRYPTION_KEY, AUTH_SECRET, DB_PASSWORD → stored in AWS Secrets Manager
  - [x] `user_data.sh.tftpl` — Docker + Docker Compose install, Infisical Compose with Postgres + Redis, systemd service
- [x] Wire into `packages/iac/environments/lean-prod/` as `module "infisical_host"`

### 1. Infrastructure Provisioning
- [x] `terraform apply` on the `infisical-aws` module to provision EC2 + ALB + ACM + Route53
- [x] Verify EC2 boots and Infisical services start (SSM `aws ssm start-session`)
- [x] Verify ALB health check passes (path: `/api/health` or Infisical equivalent)
- [x] Verify DNS resolves `secrets.cig.technology` → ALB

### 2. Configuration
- [x] Set Infisical env vars on EC2: `SITE_URL`, `DB_CONNECTION_URI`, `REDIS_URL`, `ENCRYPTION_KEY`, `AUTH_SECRET`, `SMTP_*`
- [ ] Create workspaces via Infisical CLI/API:
  - [ ] `cig-production`
  - [ ] `alternun-production`
  - [ ] `hashpass-production`
- [ ] Create machine identities per workspace:
  - [ ] API service (ECS)
  - [ ] Dashboard service (ECS)
  - [ ] Landing service (ECS)
  - [ ] GitHub Actions CI
- [ ] Configure Authentik OIDC provider → Infisical SSO for dashboard access
- [ ] Configure audit log export to S3/CloudWatch Logs

### 3. Secret Migration
- [x] List all secrets in AWS Secrets Manager: `aws secretsmanager list-secrets --region us-east-2`
- [x] Write migration script `scripts/migrate-secrets-to-infisical.mjs` (pattern: `scripts/migrate-cig-account.mjs`)
  - [x] Read secret from AWS SM
  - [x] Map to correct Infisical workspace + folder
  - [x] Push via `infisical secrets set` or SDK
- [x] Run migration on production

### 4. Application Integration

#### Standalone EC2 / API (`packages/iac/modules/api-host/`)
- [x] Replace AWS Secrets Manager `secret()` calls in EC2 bootstrap with Infisical CLI exports
- [x] Install Infisical CLI during EC2 cloud-init phase
- [x] Generate service token for `cig-production` (`prod`) and inject via Terraform
- [ ] Remove `secretsmanager:GetSecretValue` from API host IAM role after transition complete

#### GitHub Actions (`.github/workflows/`)
- [ ] Install `infisical` CLI in CI workflows OR use Infisical GitHub Action
- [ ] Replace `aws secretsmanager get-secret-value` calls in:
  - [ ] `.github/workflows/deploy-api.yml`
  - [ ] `.github/workflows/deploy-llm-proxy.yml`
- [ ] Store Infisical machine identity token as GitHub Actions secret during transition

### 5. Backup & DR
- [ ] Create S3 bucket for Infisical backups: `cig-infisical-backups` (encrypted, versioned)
- [ ] Add cron/systemd timer on EC2: daily `pg_dump` → S3
- [ ] Validate restore procedure: restore from S3 dump → new EC2 → functional
- [ ] Document DR runbook in `docs/infisical/dr.md`

### 6. Cut-over & Cleanup
- [ ] Deploy to staging, validate all services start with Infisical-sourced secrets
- [ ] Deploy to production
- [ ] Delete migrated secrets from AWS Secrets Manager (confirm $0 cost on next billing cycle)
- [ ] Update `docs/` and runbooks to reference Infisical
- [ ] Create `docs/infisical/README.md` with architecture overview, workspace map, and admin guide

---

## Reference

- Infisical self-hosted docs: https://infisical.com/docs/self-hosting/overview
- Infisical ECS guide: https://infisical.com/docs/integrations/platforms/ecs
- Reference Terraform module: `packages/iac/modules/authentik-aws/main.tf` (ALB + ACM + EC2 + EIP + Route53 + IAM)
- Reference Terraform module: `packages/iac/modules/authentik-aws/secrets.tf` (random_password + Secrets Manager bootstrap)
- Reference environment: `packages/iac/environments/lean-prod/main.tf` (module composition)
- Migration script pattern: `scripts/migrate-cig-account.mjs`
- AWS Secrets Manager current spend: $6.71/month (June 2026)
- Current secrets account: AWS `520900722378`, region `us-east-2`
- Default VPC pattern (no custom VPC cost): `data "aws_vpc" "default" { default = true }`
- Infisical Compose services: infisical-server (Node.js), postgres 16, redis 7
