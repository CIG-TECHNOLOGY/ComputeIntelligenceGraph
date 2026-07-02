# Feature: EC2 Rightsizing and Cost Reduction

**Status:** pending
**Priority:** medium
**Current AWS cost:** ~$14.73/month EC2 Compute + $2.36/month EC2-Other = ~$17.09/month combined
**Region:** us-east-2

---

## Goal

Audit running EC2 instances and ECS Fargate task sizing to eliminate over-provisioned resources and reduce compute spend.

---

## Background

EC2/Fargate costs at $17/month combined. "EC2-Other" typically covers EBS volumes, data transfer, and Elastic IPs. Opportunities:
- Downsize instance types if CPU/memory utilization is consistently low
- Switch to Graviton (ARM) instances/tasks for 20–40% cost savings
- Use Savings Plans or Spot for predictable workloads
- Delete unattached EBS volumes and unused snapshots

---

## Requirements

- [ ] No production downtime during any instance resizing
- [ ] All ECS Fargate tasks continue to pass health checks after CPU/memory changes
- [ ] Graviton (ARM) compatibility must be verified for all Docker images before switching

---

## Tasks

### 1. Audit
- [ ] List running EC2 instances and types: `aws ec2 describe-instances --region us-east-2 --filters "Name=instance-state-name,Values=running"`
- [ ] Check CPU utilization via CloudWatch for last 30 days (flag anything consistently <20%)
- [ ] List ECS task definitions and check CPU/memory allocations: `aws ecs list-task-definitions --region us-east-2`
- [ ] Find unattached EBS volumes: `aws ec2 describe-volumes --region us-east-2 --filters "Name=status,Values=available"`
- [ ] Find unused Elastic IPs: `aws ec2 describe-addresses --region us-east-2` (unassociated = $0.005/hour each = ~$3.65/month)

### 2. EC2 Instance Rightsizing
- [ ] For the Authentik host: check if it can move from current type to `t4g.small` (Graviton, ~$12/month vs ~$17 for t3.small)
- [ ] Verify Authentik Docker images support ARM64 (official images do)
- [ ] Schedule maintenance window and resize (stop → change type → start)

### 3. ECS Fargate Task Rightsizing
- [ ] Check actual memory/CPU usage in CloudWatch Container Insights
- [ ] Reduce over-allocated tasks (e.g. 512 CPU / 1024 MB → 256 CPU / 512 MB if usage supports it)
- [ ] Consider Fargate Spot for non-critical or background tasks (up to 70% savings)
- [ ] Rebuild Docker images as multi-arch (linux/amd64,linux/arm64) to enable Fargate Graviton

### 4. Storage Cleanup
- [ ] Delete unattached EBS volumes after confirming they are not needed
- [ ] Delete old EBS snapshots older than 90 days
- [ ] Review ECR storage: `aws ecr describe-repositories --region us-east-2` — apply lifecycle policies to expire old images

### 5. Savings Plans (if commit is justified)
- [ ] If Fargate usage is stable, purchase a 1-year Compute Savings Plan for ~20% discount
- [ ] Evaluate using AWS Cost Explorer Savings Plan recommendations

---

## Reference

- Current EC2 cost: $14.73/month Compute + $2.36/month EC2-Other (June 2026)
- AWS account: `520900722378`, region `us-east-2`
- Graviton Fargate pricing: ~20% less than x86 in us-east-2
