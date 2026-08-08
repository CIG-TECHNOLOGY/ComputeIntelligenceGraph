#!/usr/bin/env bash
# STEP 2: Stop orphaned cig-api-host EC2 (after Route 53 migrated to ALB)
# Saves: ~$30/month EC2 + $3.60 public IP = ~$33.60/month
# Prerequisite: Run 01-migrate-api-route53-to-alb.sh first and verify API works
# This does NOT terminate — you can restart if something breaks
set -euo pipefail
export AWS_PROFILE=cig-520900722378

INSTANCE_ID="i-03b62c1243460760a"

echo "=== cig-api-host current state ==="
aws ec2 describe-instances \
  --region us-east-2 \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].{State:State.Name,PublicIP:PublicIpAddress,Type:InstanceType}' \
  --output json

echo ""
echo "=== Stopping $INSTANCE_ID (cig-api-host) ==="
aws ec2 stop-instances \
  --region us-east-2 \
  --instance-ids $INSTANCE_ID \
  --output json

echo ""
echo "=== Waiting for stop ==="
aws ec2 wait instance-stopped \
  --region us-east-2 \
  --instance-ids $INSTANCE_ID
echo "STOPPED"

echo ""
echo "=== Final state ==="
aws ec2 describe-instances \
  --region us-east-2 \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].{State:State.Name,PublicIP:PublicIpAddress}' \
  --output json

echo ""
echo "Savings: ~\$33.60/month"
echo "To clean up the old VPC entirely, run 03-cleanup-old-vpc.sh"
