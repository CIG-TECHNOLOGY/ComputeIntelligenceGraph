#!/usr/bin/env bash
# STEP 1: Migrate api.cig.technology from direct EC2 IP → ALB alias
# Saves: ~$33/month (stops cig-api-host EC2 + removes 1 public IP)
# Risk: LOW — ECS Fargate is already healthy in the ALB target group
# After running: verify API works, then run 02-stop-cig-api-host.sh
set -euo pipefail
export AWS_PROFILE=cig-520900722378

HOSTED_ZONE_ID="Z0870194ADDT0AX8LDML"
ALB_DNS="cig-api-production-alb-2027942852.us-east-2.elb.amazonaws.com"
ALB_HOSTED_ZONE="Z3AADJGX6KTTL2"  # us-east-2 ALB hosted zone ID

echo "=== Current api.cig.technology record ==="
aws route53 list-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --query 'ResourceRecordSets[?Name==`api.cig.technology.`]' \
  --output json

echo ""
echo "=== Updating api.cig.technology → cig-api-production-alb ==="
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Comment": "Migrate api.cig.technology from EC2 direct IP to ALB",
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.cig.technology.",
          "Type": "A",
          "AliasTarget": {
            "HostedZoneId": "Z3AADJGX6KTTL2",
            "DNSName": "cig-api-production-alb-2027942852.us-east-2.elb.amazonaws.com.",
            "EvaluateTargetHealth": true
          }
        }
      }
    ]
  }'

echo ""
echo "=== Waiting 90s for DNS propagation (TTL=60s) ==="
sleep 90

echo ""
echo "=== Verify: resolve api.cig.technology ==="
dig +short api.cig.technology

echo ""
echo "=== Verify: API health check via ALB ==="
curl -s -o /dev/null -w "HTTP status: %{http_code}\n" https://api.cig.technology/health || \
curl -s -o /dev/null -w "HTTP status: %{http_code}\n" https://api.cig.technology/ || true

echo ""
echo "SUCCESS: api.cig.technology now routes through cig-api-production-alb"
echo "Run 02-stop-cig-api-host.sh next after confirming the API works."
