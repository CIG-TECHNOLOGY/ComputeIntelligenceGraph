# Agent Task Board

Tasks are organized by delivery state. A folder moves only when its status is supported by repository or operational evidence; incomplete checklists are not silently marked complete.

| State | Meaning |
| --- | --- |
| [pending/](pending/) | Approved work that has not started. |
| [active/](active/) | Work with implementation underway or a required production handoff remaining. |
| [done/](done/) | Completed work, or superseded work whose outcome is now covered by a replacement task. |

## Current queue

| State | Task | Why it is in this state |
| --- | --- | --- |
| active | [Cloud Operations Command Center](active/cloud-operations-command-center/task.md) | AWS onboarding and organization-isolation discovery are the first active milestone. |
| active | [Umami Analytics SaaS](active/umami-analytics-saas/task.md) | Validate the product boundary and deliver the shared-tenancy MVP around a maintainable Umami integration. |
| pending | [Minimal always-on infrastructure](pending/minimal-always-on-infra/task.md) | Critical guardrails and recovery work have not started. |
| pending | [EC2 rightsizing](pending/aws-ec2-rightsizing/task.md) | Needs fresh utilization evidence before any resize. |
| active | [Infisical secrets manager](active/infisical-secrets-manager/task.md) | Provisioning and migration are partly complete; identities, backups, CI migration, and cut-over remain. |
| active | [Uptime monitoring SaaS](active/uptime-monitor-saas/task.md) | The product is built and host provisioned; bootstrap, migrations, and tenant go-live remain. |
| active | [Git/CI fallback](active/git-ci-fallback/task.md) | Package and Terraform module exist; deployment, Hashpass onboarding, and failover testing remain. |
| done | [Legacy API/NAT/ALB cost-reduction scripts](done/aws-cost-reduction/README.md) | Retired after the API edge, NAT gateway, and API load balancer were removed; ongoing controls belong to the minimal-infrastructure task. |
| done | [NAT gateway cost reduction](done/aws-vpc-nat-cost-reduction/task.md) | The NAT gateway removal outcome is recorded by the minimal-infrastructure task. |
| done | [ALB cost reduction](done/aws-alb-cost-reduction/task.md) | The API load-balancer removal outcome is recorded by the minimal-infrastructure task. |

## Task-file convention

Each task must state its status, owner, scope, non-negotiable constraints, ordered checklist, acceptance criteria, and the evidence required to move it. Do not put credentials, cloud account identifiers, access tokens, or customer data in task files.
