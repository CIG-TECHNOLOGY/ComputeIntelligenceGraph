#!/usr/bin/env bash
# STEP 8: Remove public IPs from authentik-server and infisical-server
# These EC2s are only accessed via their ALBs — they don't need public IPs
# Saves: ~$7.20/month (2 public IPs × $3.60/month each)
# NOTE: Instances must be stopped and restarted to lose auto-assigned public IP
#       If using Elastic IPs, they must be explicitly disassociated
set -euo pipefail
export AWS_PROFILE=cig-520900722378
REGION="us-east-2"

AUTHENTIK_ID="i-029c2ef3badb8b5fa"   # authentik-server t3.small
INFISICAL_ID="i-0fb70935f5715be11"   # infisical-server t3.small

echo "=== Check current public IPs ==="
for id in $AUTHENTIK_ID $INFISICAL_ID; do
  aws ec2 describe-instances --region $REGION --instance-ids $id \
    --query 'Reservations[0].Instances[0].{Name:Tags[?Key==`Name`]|[0].Value,PublicIP:PublicIpAddress,EIP:NetworkInterfaces[0].Association.AllocationId}' \
    --output json
done

echo ""
echo "=== Check for Elastic IPs ==="
# If EIP is attached, disassociate and release
for id in $AUTHENTIK_ID $INFISICAL_ID; do
  alloc_id=$(aws ec2 describe-instances --region $REGION --instance-ids $id \
    --query 'Reservations[0].Instances[0].NetworkInterfaces[0].Association.AllocationId' \
    --output text 2>/dev/null)
  if [ -n "$alloc_id" ] && [ "$alloc_id" != "None" ]; then
    assoc_id=$(aws ec2 describe-addresses --region $REGION --allocation-ids $alloc_id \
      --query 'Addresses[0].AssociationId' --output text)
    echo "Disassociating EIP $alloc_id from $id"
    aws ec2 disassociate-address --region $REGION --association-id $assoc_id
    aws ec2 release-address --region $REGION --allocation-id $alloc_id
    echo "  Released EIP $alloc_id"
  else
    echo "$id: using auto-assigned public IP (not EIP)"
    echo "  To remove: stop the instance, modify subnet to not auto-assign, restart"
    echo "  OR: ensure security group blocks all direct inbound access (ALB only)"
  fi
done

echo ""
echo "=== Recommended: Block direct inbound access (security group restriction) ==="
echo "Even without removing the public IP, you can restrict inbound access"
echo "to only allow traffic from the ALB security groups:"
echo ""
echo "For authentik-server SG — allow port 9000 only from authentik-alb SG:"
echo "  1. Remove: 0.0.0.0/0 on port 9000 (if it exists)"
echo "  2. Add: sg-00d620cb3bbef9456 (authentik-alb-sg) on port 9000"
echo ""
echo "Run 08b-restrict-ec2-sgs.sh to apply this automatically."
