# Feature: Reduce Application Load Balancer Cost

**Status:** pending
**Priority:** high
**Current AWS cost:** ~$15.99/month (29.3% of total spend — single largest cost)
**Region:** us-east-2

---

## Goal

Reduce or eliminate ALB cost without breaking production traffic routing.

---

## Background

ALB pricing in us-east-2:
- $0.008/LCU-hour (~$5.76/month base)
- $0.018/hour per ALB (~$13/month per ALB)

If there are 2 ALBs running (e.g. one for API, one for internal/Authentik), that alone is $26/month base before LCU charges.

---

## Requirements

- [ ] Audit how many ALBs exist and what they serve
- [ ] No downtime during any consolidation
- [ ] HTTPS (TLS) must remain on all public endpoints
- [ ] Health checks must continue working for ECS services

---

## Tasks

### 1. Audit
- [ ] List all ALBs: `aws elbv2 describe-load-balancers --region us-east-2`
- [ ] List all target groups and rules to understand routing
- [ ] Identify if multiple ALBs can be consolidated to one using host-based or path-based routing

### 2. Consolidation Options (pick one)

#### Option A: Single ALB with host-based routing (recommended)
- Route `api.cig.technology` → API target group
- Route `auth.cig.technology` → Authentik target group
- Route `*.cig.lat` → Dashboard/Landing target groups
- Eliminates extra ALB cost (~$13/month per removed ALB)

#### Option B: Replace ALB with Caddy or nginx on EC2 (most aggressive)
- Run a reverse proxy on the existing EC2 host
- Use `ec2-instance-connect` or SSM Session Manager for access
- Point Route 53 A records directly to EC2 IP
- Eliminates ALB entirely but loses managed health checks and native ECS service registration
- Only viable if traffic volume is low and high-availability is not required

#### Option C: AWS API Gateway (HTTP API) for the API service
- HTTP API is ~$1/million requests (much cheaper than ALB for low-traffic APIs)
- Use VPC Link to route to ECS tasks
- Keeps ALB only for dashboard/landing

### 3. Implementation (after choosing option)
- [ ] Update ECS services to register with consolidated target groups
- [ ] Update Route 53 records if ALB DNS names change
- [ ] Update CORS origins if API endpoint changes
- [ ] Remove unused ALBs and listeners
- [ ] Validate health check endpoints respond after consolidation

---

## Reference

- Current ALB cost: $15.99/month (June 2026)
- AWS account: `520900722378`, region `us-east-2`
- CORS config: `packages/api/src/cors.ts`
