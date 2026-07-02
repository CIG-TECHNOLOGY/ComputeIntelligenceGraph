# Infisical Secrets Manager

Compute Intelligence Graph (CIG) utilizes [Infisical](https://infisical.com/) as its central, self-hosted Secrets Manager. It replaces AWS Secrets Manager to provide zero-cost horizontal scaling, a powerful multi-tenant developer dashboard, and robust integration with CI/CD platforms (like GitHub Actions) and runtime environments (like ECS).

## Current State

- **Environment**: Production
- **Host**: `secrets.cig.technology`
- **AWS Account**: `520900722378` (CIG Production)
- **Region**: `us-east-2`
- **Instance**: Dedicated `t3.small` EC2 instance (`i-0fb70935f5715be11` or similar, check Terraform state)
- **Deployment**: Configured via the `infisical-aws` Terraform module inside `packages/iac/modules/infisical-aws/`.
- **Admin Setup**: The first user to register via `https://secrets.cig.technology/` becomes the super-admin.

## Architecture

We use a standalone, minimal-cost EC2 architecture designed to match our `authentik-sso` host pattern.

```
┌───────────────────────────────────────────────────────────┐
│  Route53: secrets.cig.technology ─── ALB (HTTPS:443)      │
│                                          │                │
│                              Security Group (ALB→EC2)     │
│                                          │                │
│  ┌──────────────────────────────────────────────────┐     │
│  │  EC2 t3.small (dedicated Infisical host)         │     │
│  │  ├── Docker Compose: Infisical backend           │     │
│  │  ├── Docker Compose: PostgreSQL 16               │     │
│  │  ├── Docker Compose: Redis 7                     │     │
│  │  ├── Encrypted EBS root volume (gp3, 30GB)       │     │
│  │  └── SSM managed (no SSH required)               │     │
│  └──────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────┘
```

### Encryption Key Management

The core security of Infisical relies on an `ENCRYPTION_KEY` which is used to perform envelope encryption on all secrets stored in the PostgreSQL database.

During infrastructure provisioning (`terraform apply`), the following steps occur automatically:
1. Terraform creates a highly secure, randomly generated 16-byte hex string (32 characters).
2. It is saved in **AWS Secrets Manager** under `/infisical/secrets.cig.technology/encryption-key`.
3. The EC2 instance retrieves it securely during the cloud-init bootstrap phase via its IAM Instance Profile.
4. It is injected into `/opt/infisical/.env` and passed to the Docker containers.

> **CRITICAL WARNING:** Losing or changing the `ENCRYPTION_KEY` will render all existing secrets in the Infisical database permanently unrecoverable.

### Email Notifications
The instance has been configured with the main `SMTP_FROM_EMAIL` notifications identity. Infisical will automatically send organization invites and password recovery emails via the specified SMTP server (`mail.xn--tlo-fla.com`).

## Operating Workspaces

Workspaces function as isolated environments. We maintain specific boundaries:
- `cig-production` — Main CIG platform configuration.
- `alternun-production` — Alternun project secrets.
- `hashpass-production` — Hashpass project secrets.

## Disaster Recovery (DR)

### Backup Mechanism
All secrets are encrypted and stored in PostgreSQL running on the dedicated EC2 instance.
In the future, a systemd timer should automatically trigger a daily `pg_dump` and upload it to a dedicated, encrypted S3 bucket.

### Recovery Procedure
If the EC2 instance goes down entirely but the EBS volume survives:
1. Re-run `terraform apply` to recreate the EC2 instance and ALB.
2. The `user_data` script will pull the exact same `ENCRYPTION_KEY` and `AUTH_SECRET` from AWS Secrets Manager.
3. Attach the old EBS volume data (or restore from snapshots) into the new instance.
4. Infisical will decrypt correctly.