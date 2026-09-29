# Legacy AWS Cost-Reduction Scripts

**Status:** superseded — do not run these scripts

The scripts in this directory targeted the former API host, API load balancer, and NAT gateway. The current [minimal always-on infrastructure task](../../pending/minimal-always-on-infra/task.md) records that the API edge, NAT gateway, API DNS, and API load balancer have already been intentionally removed and that the API runtime is at zero tasks.

Several scripts would now recreate or mutate retired infrastructure, and the old SSM/Secrets Manager approach conflicts with the Infisical-first mandate. Retain them only as history. Any new FinOps or infrastructure change must use the minimal-infrastructure task's explicit `wake`/`hibernate` safeguards.
