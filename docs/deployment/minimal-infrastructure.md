# Minimal AWS Footprint and Recovery Runbook

**Status:** active operating policy  
**Last reviewed:** 2026-07-27  
**Audience:** CIG operators and infrastructure maintainers

This runbook records the deliberately minimal production footprint adopted after an unexpected increase in AWS gross monthly usage. The increase was fixed infrastructure cost, not evidence of application traffic: the largest charges came from always-on networking, load balancing, public IPv4 addresses, and idle compute.

## Operating policy

Only two services are always-on:

| Service | State | Why it remains on | Guard |
| --- | --- | --- | --- |
| CIG status service | running | Public service-health visibility | Never stop via an automated schedule or cost-cleanup script. |
| Self-hosted Infisical | running | Required secret store and recovery dependency | Never stop via an automated schedule or cost-cleanup script; back it up before changing it. |
| Authentik | stopped / cold standby | Not needed while the product is inactive | Start only for an approved authentication recovery or product wake-up. |
| CIG API, ECS runtime, Neo4j, API edge | hibernated / removed | No active users | Recreate only through the controlled wake-up procedure. |

The public status page and the Infisical endpoint were verified after this policy was applied. Authentik is intentionally unavailable while stopped.

## Completed reductions

The following production API-edge resources were removed after the API service was set to zero desired and zero running tasks:

- API DNS record
- API application load balancer
- NAT gateway and its Elastic IP
- API ECS runtime

The API and Neo4j data volumes were preserved. The status service and Infisical were restarted after an initial broad hibernation action and are protected by the policy above.

One Authentik load balancer, its stopped host's storage, and related address resources may still produce baseline charges. They are intentionally not deleted by this runbook because authentication recovery may require them. Their replacement or removal is part of the pending rebuild task.

## Secrets migration status

Twenty-five application secrets were imported into the CIG production environment in Infisical and their key metadata was verified. The original AWS Secrets Manager entries remain as a recovery source; they have **not** been deleted.

Infisical's own bootstrap values are a special case. Its encryption key, authentication secret, and database credential cannot depend solely on the Infisical service that needs them to start. Before eliminating AWS Secrets Manager, move those three values to a root-of-trust recovery mechanism with restricted host access and tested restore instructions. Do not place an Infisical bootstrap token back in AWS Secrets Manager as a permanent dependency.

Never place secret values or Infisical access tokens in shell arguments, commit history, CI logs, or this documentation. Use a scoped machine identity and an environment file readable only by the service account, or the Infisical agent/SDK.

## Cost expectation

The July gross-usage view was about $191/month, compared with an earlier operating level of roughly $50/month. The reduction removed the two largest avoidable fixed components: the API load balancer and NAT gateway, along with their address cost and idle API runtime. Actual savings are only final after the next complete billing period because partial-month charges and remaining Authentik resources continue to accrue.

Review Cost Explorer by service and usage type after the billing period closes. A healthy result should show no recurring NAT gateway or API load-balancer hours and a small, explainable baseline for only the status host, Infisical host, storage, DNS, and any explicitly retained Authentik standby resources.

## Safety rules

1. Do not run a blanket apply in `packages/iac/environments/api-prod` or `packages/iac/environments/lean-prod` until the minimal/cold-standby controls in the pending task are implemented. The present configurations can recreate hibernated resources.
2. Treat the status service and Infisical as protected resources in every cleanup script, scheduler, and Terraform mode.
3. Take and verify encrypted Infisical database and volume backups before upgrading, resizing, or changing its secret bootstrap.
4. Preserve stopped-instance volumes until a tested recovery path exists.
5. Use a reviewed Terraform plan and an explicit operator approval for any deletion of the remaining Authentik edge, Elastic IPs, or persistent volumes.

## Wake-up paths

### Status service or Infisical incident

Keep the service running. Diagnose its process, health checks, disk capacity, and backups first. Do not use cost-cleanup automation as an incident response. For Infisical, restore its database and the unchanged encryption key together; a database restore without the original encryption key cannot decrypt existing secrets.

### Authentication recovery

Start the Authentik cold-standby host, wait for its application and load-balancer health checks, then verify the authentication URL and required OIDC clients. Review its persisted storage before any rebuild.

### Product/API recovery

The API is a **rebuild**, not an instant scale-up: its load balancer, NAT gateway, public DNS record, and ECS runtime were intentionally removed. Follow the pending task's explicit `wake` procedure, beginning with a Terraform plan and the preserved data-volume inventory. Do not recreate the API edge until secret delivery from Infisical and the backup/rollback plan have passed validation.

## Source of truth and follow-up

- Current composition: `packages/iac/environments/lean-prod` and `packages/iac/environments/api-prod`
- Existing Infisical migration task: `.agents/pending-tasks/infisical-secrets-manager/task.md`
- Required follow-up: `.agents/pending-tasks/minimal-always-on-infra/task.md`

The pending task converts this emergency reduction into a reproducible minimal architecture: protected status and Infisical services, a cold Authentik standby, an opt-in API rebuild, Infisical-native secret delivery, backups, and billing guardrails.
