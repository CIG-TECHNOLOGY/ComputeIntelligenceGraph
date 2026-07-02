# Infisical AWS Module (`infisical-aws`)

This Terraform module provisions a standalone, highly-available Infisical Secrets Manager deployment on AWS using EC2, Docker Compose, and ALB, optimized for minimal cost and multi-tenant isolation.

## Architecture

The module sets up a standalone EC2 `t3.small` (default) running Amazon Linux 2023. Services run via Docker Compose:
- **Infisical Backend**: Serves API and UI traffic.
- **PostgreSQL 16**: Main data store (encrypted at rest on a 30GB gp3 EBS volume).
- **Redis 7**: Caching and background job processing.

The instance is placed in the default VPC to avoid custom VPC costs (NAT gateways, etc.). Traffic flows as:
`Route 53 (DNS) -> ALB (HTTPS termination via ACM) -> EC2 (Port 80)`

## Security & Compliance

- **No SSH Required:** Instance is managed strictly via AWS Systems Manager (SSM) Session Manager. Security groups only allow port 80 from the ALB.
- **EBS Encryption:** The root volume is encrypted using an AWS-managed KMS key.
- **Bootstrap Secrets via AWS Secrets Manager:**
  - `ENCRYPTION_KEY`: A 16-byte cryptographically secure random ID (32 hex characters) required for Infisical AES-256-GCM envelope encryption.
  - `AUTH_SECRET`: A 50-character random password for JWT signing.
  - `POSTGRES_PASSWORD`: A random password for the internal PostgreSQL container.
  These are fetched automatically during `user_data` bootstrap by the EC2 IAM Instance Profile.

## Usage

```hcl
module "infisical_host" {
  source = "../../modules/infisical-aws"

  region              = "us-east-2"
  domain              = "secrets.cig.technology"
  route53_zone_id     = "Z0870194ADDT0AX8LDML"
  infisical_image_tag = "v0.161.0"
  instance_type       = "t3.small"

  # Optional SMTP Configuration
  smtp_host     = "mail.domain.com"
  smtp_port     = 587
  smtp_username = "notifications@domain.com"
  smtp_password = "smtp-password"
  smtp_from     = "notifications@domain.com"

  multi_tenant  = true
}
```

## Maintenance & Recovery

### Changing `ENCRYPTION_KEY`
**WARNING:** If the `ENCRYPTION_KEY` is lost or modified after secrets are saved, all encrypted secrets will be permanently unrecoverable! The `ENCRYPTION_KEY` is managed by AWS Secrets Manager. If you destroy and recreate this module, the database volume will also be destroyed, meaning a fresh key will be generated for the fresh DB.

### Troubleshooting Invalid Key Length
Infisical requires the `ENCRYPTION_KEY` to be exactly a 16-byte representation (32 hex characters) if using standard AES configurations for its root key. In `secrets.tf`, we generate this using `random_id` with `byte_length = 16`. If it's too long or short, Infisical migrations will fail with `ERR_CRYPTO_INVALID_KEYLEN`.
