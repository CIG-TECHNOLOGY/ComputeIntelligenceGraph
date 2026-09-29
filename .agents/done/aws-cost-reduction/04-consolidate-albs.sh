#!/usr/bin/env bash
# STEP 4: Consolidate infisical-alb into authentik-alb
# Saves: ~$16/month (1 ALB eliminated) + ~$3.60/month (2 fewer public IPs)
# Strategy: Add infisical cert + host-based routing rule to authentik-alb,
#           update Route 53, delete infisical-alb
set -euo pipefail
export AWS_PROFILE=cig-520900722378

AUTHENTIK_ALB_NAME="authentik-alb"
INFISICAL_ALB_NAME="infisical-alb"
HOSTED_ZONE_ID="Z0870194ADDT0AX8LDML"
INFISICAL_CERT_ARN="arn:aws:acm:us-east-2:520900722378:certificate/896042ad-82e8-4c37-92aa-4fe182e2d3ae"
INFISICAL_TG_ARN="arn:aws:elasticloadbalancing:us-east-2:520900722378:targetgroup/infisical-tg/f0d1c55dc875c775"

echo "=== Getting authentik-alb details ==="
AUTHENTIK_ALB_ARN=$(aws elbv2 describe-load-balancers --region us-east-2 --names $AUTHENTIK_ALB_NAME \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)
AUTHENTIK_ALB_DNS=$(aws elbv2 describe-load-balancers --region us-east-2 --names $AUTHENTIK_ALB_NAME \
  --query 'LoadBalancers[0].DNSName' --output text)
HTTPS_LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn $AUTHENTIK_ALB_ARN --region us-east-2 \
  --query 'Listeners[?Port==`443`].ListenerArn' --output text)

echo "authentik-alb ARN: $AUTHENTIK_ALB_ARN"
echo "authentik-alb DNS: $AUTHENTIK_ALB_DNS"
echo "HTTPS listener ARN: $HTTPS_LISTENER_ARN"

echo ""
echo "=== Getting infisical-alb ARN (for deletion later) ==="
INFISICAL_ALB_ARN=$(aws elbv2 describe-load-balancers --region us-east-2 --names $INFISICAL_ALB_NAME \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)
echo "infisical-alb ARN: $INFISICAL_ALB_ARN"

echo ""
echo "=== Step 1: Add infisical cert to authentik-alb HTTPS listener ==="
aws elbv2 add-listener-certificates \
  --listener-arn $HTTPS_LISTENER_ARN \
  --certificates CertificateArn=$INFISICAL_CERT_ARN \
  --region us-east-2 \
  --output json && echo "Cert added"

echo ""
echo "=== Step 2: Add host-based routing rule for secrets.cig.technology ==="
# Priority 1 = highest (evaluated before default rule)
aws elbv2 create-rule \
  --listener-arn $HTTPS_LISTENER_ARN \
  --region us-east-2 \
  --priority 10 \
  --conditions '[{"Field":"host-header","HostHeaderConfig":{"Values":["secrets.cig.technology"]}}]' \
  --actions "[{\"Type\":\"forward\",\"TargetGroupArn\":\"$INFISICAL_TG_ARN\"}]" \
  --output json | python3 -c "import json,sys; r=json.load(sys.stdin); print('Rule ARN:', r['Rules'][0]['RuleArn'])"

echo ""
echo "=== Step 3: Update Route 53 secrets.cig.technology → authentik-alb ==="
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch "{
    \"Comment\": \"Move secrets.cig.technology to consolidated authentik-alb\",
    \"Changes\": [
      {
        \"Action\": \"UPSERT\",
        \"ResourceRecordSet\": {
          \"Name\": \"secrets.cig.technology.\",
          \"Type\": \"A\",
          \"AliasTarget\": {
            \"HostedZoneId\": \"Z3AADJGX6KTTL2\",
            \"DNSName\": \"$AUTHENTIK_ALB_DNS.\",
            \"EvaluateTargetHealth\": true
          }
        }
      }
    ]
  }" && echo "Route 53 updated"

echo ""
echo "=== Waiting 90s for DNS propagation ==="
sleep 90

echo ""
echo "=== Step 4: Verify secrets.cig.technology is reachable ==="
curl -s -o /dev/null -w "HTTP status: %{http_code}\n" https://secrets.cig.technology/ || true

echo ""
echo "=== Step 5: Delete infisical-alb ==="
read -p "secrets.cig.technology verified working? Delete infisical-alb? [y/N] " confirm
if [[ "$confirm" =~ ^[Yy]$ ]]; then
  aws elbv2 delete-load-balancer --load-balancer-arn $INFISICAL_ALB_ARN --region us-east-2
  echo "infisical-alb deleted"
  echo "Savings: ~\$19.60/month (ALB + public IPs)"
else
  echo "Skipped deletion. Re-run and confirm when ready."
fi
