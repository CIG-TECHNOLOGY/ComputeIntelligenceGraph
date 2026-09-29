# Feature: Cloud Operations Command Center

**Status:** active — discovery and AWS onboarding are the first milestone
**Priority:** critical
**Audience:** every registered CIG dashboard organization that explicitly opts in
**First design partner:** Hashpass
**Owners:** dashboard, platform, and security teams

## Product decision

This is a multi-tenant capability, not a new duplicate dashboard.

The existing CIG dashboard surfaces are the product views:

- **Costs** (/costs) becomes the organization's connected-cloud cost analysis.
- **Security** (/security) becomes the organization's connected-cloud findings and triage view.
- **Notifications** becomes the durable delivery and inbox surface for operational alerts.
- The existing dashboard overview may show a small connector-health/status summary and link into those surfaces.
- A new **Settings → Cloud Connections** onboarding surface is required. It is the only new feature area in the first release.

Do not build another cost page, security page, or standalone command-center analytics screen.

## Repository evidence and current gaps

The existing UI is a foundation, not yet a safe multi-tenant cloud-monitoring service:

1. The existing Costs page renders costs, but packages/api/src/costs.ts has one process-wide AWS Cost Explorer client and 24-hour global cache; it has no organization/connection scope and Google Cloud costs are a stub.
2. The existing Security page renders findings, but packages/api/src/security.ts scans the unscoped graph through a singleton cache. The current routes identify Costs and Security as later-phase stubs.
3. Notifications are in-memory browser state, so they are not durable, organization-scoped, or suitable for alert delivery.
4. Human authentication validates a JWT, and internal utilities can read a single tenant/workspace claim, but the dashboard exposes no permissions (getPermissions() returns null) and there is no verified organization-membership/role model for cloud connectors.

**Implication:** do not connect a customer account until organization membership, server-side authorization, and connector-scoped data isolation are implemented and tested.

## AWS access decision

### Recommended first release: customer-owned cross-account role

The customer authorizes CIG once by deploying a reviewed CloudFormation stack or Terraform module **inside the customer's AWS account**. The deployment creates one dedicated, read-only CIGMonitoringRole per CIG organization and environment.

- Its trust policy names only CIG's production delegation role and requires a unique per-connection AWS External ID.
- CIG's workload identity calls STS AssumeRole to receive a short-lived session. CIG never receives or stores an AWS access key, password, console session, or root credential.
- The role starts with the minimal traffic/reliability permission bundle. Cost and security bundles are separate, explicitly approved, read-only opt-ins.
- The customer can immediately revoke access by deleting the role, changing its trust policy, or disabling the connector in CIG. CIG must detect and display that revocation.

This is the recommended AWS third-party multi-tenant delegation pattern. The External ID protects against confused-deputy access; the role produces temporary rather than static credentials. Use CIG's own production workload identity—not access keys—to make the STS call.

### Alternatives

| Option | Use | Decision |
| --- | --- | --- |
| CIG OIDC issuer + customer IAM OIDC provider | Direct AssumeRoleWithWebIdentity, binding audience and immutable workload subject | Future hardening option. It avoids trusting a CIG AWS role but requires CIG to operate a secure public OIDC issuer and customer-side identity-provider lifecycle. Do not make it the first integration. |
| Customer-hosted collector | Strict-regulatory, private-network, or no-cross-account customers | Supported after the AWS role path. Collector retains all cloud credentials locally and sends a minimized, signed, outbound telemetry stream only. |
| One-time AWS browser/console authorization | A convenient approval experience | Use the customer's console login only to deploy/approve the CloudFormation stack. Do **not** treat an OAuth/Identity Center user grant, refresh token, or browser session as CIG's ongoing monitoring credential. It is tied to a human and is inappropriate for reliable unattended service monitoring. |
| Customer-provided AWS access keys | Any scenario | Never support. |

## Security and compliance controls

- Require recent reauthentication and an organization **integration-owner** role before a user can create, change, validate, or revoke a cloud connection.
- Generate a unique connection ID and External ID server-side. Treat role ARN, account ID, stack output, and connector configuration as tenant-restricted metadata; never render or log secrets.
- CIG's delegator identity is production-only, cannot be used by humans, has a short session duration, and records a connector/organization source identity and narrowly controlled session tags in STS/CloudTrail.
- Never ask a customer to grant AdministratorAccess, IAM write access, secret retrieval, data-plane writes, or deletion permissions. Permission bundles must be explicit and reviewed action-by-action.
- Make the CloudFormation/Terraform artifacts versioned, signed/reviewed, and idempotent. Show the exact requested permissions, scope, version, and revocation instructions before deployment.
- Keep connector state, ingestion queues, cache keys, alert records, and exports organization-scoped. Enforce authorization in the API/data layer and workers, not from a browser-supplied organization ID.
- Encrypt stored customer operational data, redact sensitive log fields, set retention/deletion policy before activation, and persist immutable audit records for setup, verification, token use, access, alert changes, and revocation.
- Do not claim a breach from a finding. The Security tab must display provider/source finding, evidence link, severity, freshness, and human triage state.

## First milestone: organization foundation and AWS onboarding

### 1. Establish the authorization boundary

- [ ] Design and implement organizations, memberships, roles, invitations, active-organization selection, and audit records. A user may belong to multiple organizations; a JWT's optional single tenant claim is insufficient.
- [ ] Add server-side authorization helpers and tests for organization membership and roles: owner, integration owner, operator, billing viewer, security responder, and CIG break-glass support.
- [ ] Require explicit, audited customer consent and recent reauthentication for CIG support access and all connector lifecycle actions.
- [ ] Define data classification, retention, deletion, region/residency policy, incident escalation path, and customer-facing privacy terms before ingesting real customer telemetry.

### 2. Build the AWS connection onboarding flow

- [ ] Add **Settings → Cloud Connections → Connect AWS**. The flow must explain the no-keys model, requested bundles, data collected, refresh cadence, cost implications, and immediate revocation steps.
- [ ] Create a pending connector record scoped to the active organization. Generate a one-time, time-limited setup configuration that only identifies the intended connector, requested bundle, and External ID; it must not contain a customer credential.
- [ ] Offer a reviewed CloudFormation quick-launch and Terraform module. Customer deploys it in their account while logged into their own AWS Console; CIG never receives the console session.
- [ ] Require the deployment to create the dedicated role, External ID trust condition, least-privilege policy, CloudTrail-visible session context, and no IAM/user/key creation permission.
- [ ] Receive only the role ARN and non-secret account/region metadata. Verify the role with an STS call using CIG's workload identity, then show the verified permissions and any excess privileges before activation.
- [ ] Provide visible connection states: draft, awaiting customer deployment, verifying, permission mismatch, active, stale, access revoked, disabled, and deleted. Every state needs a safe next action.

### 3. Start with one small, safe AWS telemetry bundle

- [ ] Define the initial traffic/reliability bundle from the design partner's authoritative AWS source. Include only the CloudWatch metric read actions and resource metadata needed for the approved signals.
- [ ] Document unavoidable AWS scope limitations before customers approve. For example, CloudWatch GetMetricData cannot always be constrained to a single metric/resource, so the permission review must state the account-wide metadata/metric visibility that may result.
- [ ] Implement connector-scoped metric ingestion with rate limits, retry/backoff, source freshness, per-organization quotas, encrypted storage, and no raw request bodies, query strings, or secret values.
- [ ] Update the existing dashboard overview only with connection health and links. Do not build a second traffic/cost/security view.
- [ ] Add source, observed time, received time, and freshness metadata to every ingested value.

### 4. Reuse and safely upgrade existing dashboard surfaces

- [ ] Refactor /costs and its API to require active organization and connector scope. Remove the global Cost Explorer singleton/cache behavior; cost data must never cross organizations. AWS billing remains visibly delayed; provider-billed, estimated, and forecast values are separate.
- [ ] Refactor /security and its API to query only the active organization's connector-scoped inventory/findings. Preserve provider source and triage state instead of treating generic graph rules as customer security truth.
- [ ] Replace the in-memory notification model with durable organization-scoped alerts, recipient preferences, acknowledgement, deduplication, escalation, and audit history. Link alerts to existing Costs or Security context.
- [ ] Defer Google Cloud onboarding until the AWS authorization, isolation, revocation, and existing-tab integration are validated. Its eventual design uses Workload Identity Federation, never service-account keys.

### 5. Security verification and controlled launch

- [ ] Test denial cases: no organization membership, wrong organization, insufficient role, direct-object-ID access, expired setup, altered External ID, incorrect role ARN, broader policy than approved, revoked role, and replayed setup request.
- [ ] Test that no static AWS credentials enter client code, API logs, database records, telemetry, Terraform state, browser storage, support exports, or error messages.
- [ ] Verify STS session duration, source identity/session tags, CloudTrail audit correlation, connector deletion, and immediate customer revocation.
- [ ] Run an isolated Hashpass pilot, with customer approval, using the minimal traffic/reliability bundle only. Record test evidence before enabling costs or security data.
- [ ] Conduct security review of the Terraform/CloudFormation artifact, trust policy, permissions matrix, backend authorization, retention controls, and incident/offboarding runbooks.

## Later milestones

- **AWS FinOps bundle:** customer-approved Cost Explorer and/or billing-data export integration, with delayed provider-billed data and separately labelled estimate/forecast.
- **AWS Security bundle:** approved Security Hub/GuardDuty or equivalent finding ingestion, read-only and without secret/payload collection.
- **Google Cloud:** dedicated service account plus Workload Identity Federation bound to CIG's immutable workload subject and audience; no service-account keys.
- **Customer-hosted collector:** for private or regulated environments that cannot use cross-account roles.

## Acceptance criteria for this milestone

- [ ] A user cannot create or access a connector without an active organization membership and integration-owner role; all cross-organization attempts are denied and audited.
- [ ] A customer can connect AWS by deploying a reviewed role in their own account, with no AWS key, password, console session, or persistent user grant supplied to CIG.
- [ ] CIG obtains only a short-lived, read-only STS session through its production workload identity, restricted by the customer role's unique External ID and approved permission bundle.
- [ ] The connector verifier rejects missing, altered, or over-privileged configurations and provides a safe remediation path without exposing credentials.
- [ ] Existing Costs, Security, and Notifications surfaces show only the active organization's scoped data; no duplicate analytics pages are introduced.
- [ ] Disabling or deleting the AWS role immediately prevents further ingestion, produces a visible connector state, and preserves only the permitted audit record.
- [ ] Hashpass pilot evidence demonstrates authorization isolation, revocation, freshness/error handling, log redaction, and alert routing before broader enrollment.

## References

- [AWS third-party cross-account access](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html)
- [AWS confused-deputy protection with External IDs](https://docs.aws.amazon.com/IAM/latest/UserGuide/confused-deputy.html)
- [AWS STS AssumeRole](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html)
- [AWS session tags and CloudTrail context](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html)
- [Google Cloud Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
