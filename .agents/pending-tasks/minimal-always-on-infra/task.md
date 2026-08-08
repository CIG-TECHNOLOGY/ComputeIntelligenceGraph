# Task: Rebuild CIG as Minimal Always-On Infrastructure

**Status:** pending  
**Priority:** critical  
**Owner:** infrastructure maintainers  
**Related:** `../infisical-secrets-manager/task.md`  
**Target:** keep only the status service and self-hosted Infisical always on; make all other production infrastructure explicit cold standby or opt-in rebuild.

## Context

The API edge, NAT gateway, API DNS record, and API load balancer were intentionally removed after a high fixed AWS gross-usage month. The API runtime is already at zero tasks. Status and Infisical are the only critical services and must remain available. Authentik is stopped as cold standby.

This task makes that state reproducible in infrastructure code. It must not simply delete more resources: it must preserve recovery data, establish an Infisical root of trust, and stop future Terraform applies from accidentally recreating retired infrastructure.

## Non-negotiable invariants

- The status service and Infisical are `always_on`; no scheduler, cleanup job, or default Terraform apply may stop or destroy them.
- Infisical must have encrypted, tested backups and a recovery copy of its bootstrap material before AWS Secrets Manager is retired.
- Infisical bootstrap values must not depend on Infisical itself. Use a narrowly accessible host recovery mechanism and documented break-glass restoration.
- Applications consume secrets through scoped Infisical machine identities, the agent, or the SDK. No secret values or service tokens may appear in command arguments, repository files, Terraform state, CI logs, or task output.
- Authentik is cold standby. The CIG API stack is an explicit rebuild path, never a default always-on service.
- Persistent volumes are retained until their restore path has been tested and separately approved for deletion.

## Scope

| Layer | Required end state |
| --- | --- |
| Status service | Running, monitored, and excluded from hibernation automation. |
| Infisical | Running on the smallest safe host, direct TLS/reverse proxy where appropriate, encrypted backup and restore tested. |
| Authentik | Stopped by default, with an operator-run start/verify procedure. |
| API/ECS/Neo4j edge | Absent by default; provisioned only by an explicit `wake` mode after a reviewed plan. |
| Secrets | Application secrets in Infisical; AWS Secrets Manager kept only during the validated recovery window, then scheduled for deletion. |
| FinOps | Cost anomaly/budget alert and tags that distinguish `always-on`, `cold-standby`, and `on-demand`. |

## Implementation plan

### 1. Preserve and inventory recovery state

- [ ] Export a read-only inventory of retained instances, EBS volumes, snapshots, DNS records, certificates, and Terraform state addresses. Store identifiers in an access-controlled operator record, not in this task file.
- [ ] Create encrypted snapshots/backups for Infisical before modifying its bootstrap or storage.
- [ ] Record verified restore owners, recovery time target, and the last successful restore date.
- [ ] Confirm the status page and Infisical health endpoint before and after every infrastructure change.

### 2. Establish Infisical as the durable secret source

- [ ] Create least-privilege machine identities for each runtime/CI consumer and scope them to only its project, environment, and secret path.
- [ ] Refactor `packages/iac` modules and deployment scripts that call AWS Secrets Manager to retrieve application configuration through Infisical at runtime without exposing tokens in Terraform state or process arguments.
- [ ] Replace the three Infisical bootstrap dependencies with a host-only, encrypted recovery source and documented break-glass procedure.
- [ ] Test an Infisical cold restart and a database restore using the same encryption key.
- [ ] Validate each consumer after migration, then retain AWS copies for the agreed recovery window before scheduling deletion. Do not force-delete by default.

### 3. Encode operating modes in IaC

- [ ] Refactor `packages/iac/environments/lean-prod` into explicit `always_on` and `cold_standby` controls, defaulting non-critical services to off.
- [ ] Refactor `packages/iac/environments/api-prod` so networking, NAT, load balancer, API DNS, ECS, and Neo4j are created only in an explicit `wake` mode.
- [ ] Make unsafe combinations fail validation: status or Infisical cannot be disabled; a wake-up requires an explicit acknowledgement variable and a reviewed Terraform plan.
- [ ] Ensure default plans do not recreate the removed API edge or NAT gateway.
- [ ] Document the approved operator commands for `status`, `infisical`, `authentik-start`, `api-wake`, and `api-hibernate`; use a dry-run/plan step first.

### 4. Remove remaining avoidable fixed cost

- [ ] Measure the retained Authentik load-balancer, address, and storage cost after a full billing period.
- [ ] Decide whether Authentik cold standby keeps its current edge or is rebuilt behind a low-cost direct TLS proxy only when started.
- [ ] Remove unused Elastic IPs, load balancers, target groups, certificates, and security groups only after identifying their consumers and recording a rollback path.
- [ ] Size the two always-on hosts from actual CPU, memory, disk, and availability evidence; do not downsize Infisical below a tested safe capacity.

### 5. Guard against recurrence

- [ ] Add AWS Cost Anomaly Detection and a monthly budget alert with a notification path owned by CIG operators.
- [ ] Apply `lifecycle=always-on|cold-standby|on-demand`, `service`, and `owner` tags to managed resources.
- [ ] Add a pre-deploy check that rejects a default deployment attempting to create NAT gateway, public load balancer, or API runtime resources outside `wake` mode.
- [ ] Add a runbook test at least quarterly: Infisical restore, status availability, Authentik cold start, and API wake plan (plan only unless an approved exercise).

## Acceptance criteria

- [ ] A default Terraform plan retains only the status service and Infisical as active compute and contains no API edge, NAT gateway, or ECS task creation.
- [ ] A tested `api-wake` plan can recreate the API only after explicit acknowledgement, and an `api-hibernate` plan returns it to zero baseline without touching persistent data.
- [ ] The status service and Infisical have tests/guards proving they cannot be stopped by the hibernation path.
- [ ] Every migrated application consumer retrieves a test secret from its own scoped Infisical identity.
- [ ] Infisical backup restore succeeds with the original encryption key and the result is documented without secret values.
- [ ] AWS Secrets Manager deletion is scheduled only after consumer validation and the recovery window; no unresolved production consumer remains.
- [ ] Cost Explorer after one full billing period has no recurring NAT gateway or retired API load-balancer usage and remaining charges have named owners.

## Rollback

For a migration failure, retain the original AWS secret and restore the consumer's previous configuration without deleting data. For an infrastructure failure, restore Infisical from its encrypted backup using the unchanged bootstrap material, and start Authentik only if the authentication path is required. Never roll back by applying all historical infrastructure blindly; begin with a targeted, reviewed Terraform plan.
