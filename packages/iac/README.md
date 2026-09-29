# @cig/iac

Terraform modules for CIG infrastructure provisioning.

## Structure

- `modules/neo4j/` - Neo4j core-data provisioning for the production API stack
- `modules/networking/` - VPC, public/private subnets, NAT, and API security groups
- `modules/compute/` - EC2 / container compute resources
- `environments/` - Per-environment variable files

## Production API Core Data

The first AWS production API rollout uses:

- Supabase Postgres as the external relational database provider
- `environments/api-prod/` for AWS-managed API core data
- `modules/networking/` for the API VPC/subnet/security-group layer
- `modules/neo4j/` for the private Neo4j graph instance

This environment intentionally keeps stateful core data in Terraform while the API runtime and optional pipelines live under `@cig/infra` with SST.

The primary production delivery path is the GitHub Actions workflow in `.github/workflows/deploy-api.yml`, which applies this Terraform environment, syncs runtime secrets, and then deploys the ECS/Fargate runtime from `packages/infra`.

## Permanent analytics hostnames

`environments/lean-prod` provisions a 60-second wildcard CNAME and a DNS-
validated ACM wildcard certificate for `*.analytics.cig.technology`, plus the
same pair for `*.analytics.cig.lat` when `analytics_lat_zone_id` is supplied.
Both CNAMEs point at the canonical dashboard hostname
(`analytics_dashboard_target`, default `app.cig.lat`). Attach the emitted
certificate ARN to the dashboard edge HTTPS listener (or use it as the
certificate source for the edge proxy). The application stores and validates
aliases but never creates per-user DNS records.
