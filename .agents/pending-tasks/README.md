# Pending Tasks

Cost baseline: **$54.61/month** (June 2026, AWS account `520900722378`, us-east-2)

| Feature | Folder | Potential Saving | Priority |
|---------|--------|-----------------|----------|
| Replace AWS Secrets Manager with Infisical | [infisical-secrets-manager/](infisical-secrets-manager/task.md) | ~$6.71/month | high |
| ALB consolidation / replacement | [aws-alb-cost-reduction/](aws-alb-cost-reduction/task.md) | ~$8–15/month | high |
| NAT Gateway → NAT instance or public subnets | [aws-vpc-nat-cost-reduction/](aws-vpc-nat-cost-reduction/task.md) | ~$10–14/month | high |
| EC2 rightsizing + Fargate Graviton | [aws-ec2-rightsizing/](aws-ec2-rightsizing/task.md) | ~$3–6/month | medium |

**Total potential savings: ~$27–41/month** (50–75% of current bill)

---

## How to use these task files

Each folder contains a `task.md` with:
- Goal and background
- Requirements (non-negotiable constraints)
- Ordered task checklist

Pick a task, hand it to an agent or work through it manually. Mark checkboxes as you go.
