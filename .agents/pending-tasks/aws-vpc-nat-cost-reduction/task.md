# Feature: Reduce VPC / NAT Gateway Cost

**Status:** pending
**Priority:** high
**Current AWS cost:** ~$14.21/month (26% of total spend)
**Region:** us-east-2

---

## Goal

VPC costs at $14.21/month are almost entirely NAT Gateway charges. A single NAT Gateway costs $0.045/hour (~$32/month) plus $0.045/GB data processed. This task is to eliminate or minimize NAT Gateway usage.

---

## Background

NAT Gateways are required when resources in private subnets need outbound internet access (e.g. ECS Fargate tasks pulling ECR images, calling external APIs). Alternatives:
- VPC Endpoints (free for S3/DynamoDB; ~$7/month each for interface endpoints like ECR, Secrets Manager)
- Move workloads to public subnets (with no public IP = no inbound, but still free outbound via IGW)
- Use a NAT instance (t4g.nano = ~$3/month) instead of managed NAT Gateway

---

## Requirements

- [ ] ECS tasks must still reach ECR to pull container images
- [ ] ECS tasks must still reach external APIs (Supabase, Authentik OIDC, SMTP)
- [ ] No disruption to production traffic during transition

---

## Tasks

### 1. Audit
- [ ] Identify which resources are in private subnets: `aws ec2 describe-instances --region us-east-2` and check subnet route tables
- [ ] Identify which VPC Endpoints already exist: `aws ec2 describe-vpc-endpoints --region us-east-2`
- [ ] Check NAT Gateway data transfer: CloudWatch `BytesOutToDestination` metric on the NAT GW

### 2. Option A: Replace NAT Gateway with NAT Instance (recommended for low traffic)
- Launch a `t4g.nano` or `t4g.micro` EC2 in a public subnet with source/dest check disabled
- Update private subnet route tables to route `0.0.0.0/0` → NAT instance ENI
- Cost: ~$3–5/month vs $14+/month for managed NAT GW
- Downside: single point of failure (acceptable for non-critical workloads)

### 3. Option B: Move ECS tasks to public subnets
- Fargate tasks in public subnets with `assignPublicIp: ENABLED` can reach the internet via IGW at no extra cost
- No NAT Gateway needed
- Downside: tasks get a public IP (mitigated by security groups that block all inbound)
- Steps:
  - [ ] Update ECS service network config to use public subnets
  - [ ] Set `assignPublicIp: ENABLED` in the `awsvpcConfiguration`
  - [ ] Ensure security groups only allow inbound from ALB (or nothing)
  - [ ] Delete NAT Gateway after validation
  - [ ] Release the Elastic IP associated with the NAT GW (saves $3.65/month if unattached)

### 4. Option C: VPC Endpoints for AWS services (reduces NAT data transfer)
- Add VPC endpoints for: `ecr.api`, `ecr.dkr`, `s3` (gateway, free), `secretsmanager` (if keeping AWS SM temporarily)
- ECR endpoint pair costs ~$14/month in us-east-2 — only worth it if NAT data transfer is very high
- For low-traffic setups, Option A or B is cheaper

### 5. Cleanup
- [ ] Delete NAT Gateway after confirming all traffic routes through new path
- [ ] Release associated Elastic IP: `aws ec2 release-address --allocation-id <eipalloc-...>`

---

## Reference

- Current VPC cost: $14.21/month (June 2026)
- NAT Gateway pricing: $0.045/hour + $0.045/GB processed (us-east-2)
- AWS account: `520900722378`, region `us-east-2`
