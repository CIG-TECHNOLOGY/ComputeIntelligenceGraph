#!/usr/bin/env bash
# STEP 3: Clean up orphaned old VPC vpc-00c4e9ae8483e6033
# Prerequisite: cig-api-host must be stopped (run 02-stop-cig-api-host.sh)
# This terminates the EC2 and deletes the VPC + subnet
set -euo pipefail
export AWS_PROFILE=cig-520900722378

INSTANCE_ID="i-03b62c1243460760a"
OLD_VPC_ID="vpc-00c4e9ae8483e6033"
SUBNET_ID="subnet-0741fbeaa7229e1b1"

echo "=== Checking instance is stopped ==="
STATE=$(aws ec2 describe-instances --region us-east-2 --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].State.Name' --output text)
if [ "$STATE" != "stopped" ]; then
  echo "ERROR: Instance is $STATE — must be stopped first. Run 02-stop-cig-api-host.sh"
  exit 1
fi

echo "=== Terminating cig-api-host ($INSTANCE_ID) ==="
aws ec2 terminate-instances --region us-east-2 --instance-ids $INSTANCE_ID --output json
aws ec2 wait instance-terminated --region us-east-2 --instance-ids $INSTANCE_ID
echo "TERMINATED"

echo ""
echo "=== Deleting subnet $SUBNET_ID ==="
aws ec2 delete-subnet --region us-east-2 --subnet-id $SUBNET_ID && echo "Subnet deleted"

echo ""
echo "=== Detaching and deleting internet gateway ==="
IGW_ID=$(aws ec2 describe-internet-gateways --region us-east-2 \
  --filters "Name=attachment.vpc-id,Values=$OLD_VPC_ID" \
  --query 'InternetGateways[0].InternetGatewayId' --output text)
if [ -n "$IGW_ID" ] && [ "$IGW_ID" != "None" ]; then
  aws ec2 detach-internet-gateway --region us-east-2 --internet-gateway-id $IGW_ID --vpc-id $OLD_VPC_ID
  aws ec2 delete-internet-gateway --region us-east-2 --internet-gateway-id $IGW_ID
  echo "IGW $IGW_ID deleted"
fi

echo ""
echo "=== Deleting security group (cig-api-host-sg) ==="
SG_ID=$(aws ec2 describe-security-groups --region us-east-2 \
  --filters "Name=vpc-id,Values=$OLD_VPC_ID" "Name=group-name,Values=cig-api-host-sg" \
  --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)
if [ -n "$SG_ID" ] && [ "$SG_ID" != "None" ]; then
  aws ec2 delete-security-group --region us-east-2 --group-id $SG_ID && echo "SG $SG_ID deleted"
fi

echo ""
echo "=== Deleting old VPC $OLD_VPC_ID ==="
aws ec2 delete-vpc --region us-east-2 --vpc-id $OLD_VPC_ID && echo "VPC deleted"

echo ""
echo "Old VPC cleaned up. Estimated additional savings from this cleanup: \$0 (costs already stopped with EC2)"
