#!/usr/bin/env bash
# STEP 7: Replace NAT Gateway with NAT Instance (t3.micro)
# Saves: ~$22/month ($32 NAT GW → ~$8 t3.micro + elastic IP)
# WARNING: This causes ~5-10 minutes of outage for private subnet resources
#          (neo4j, ECS tasks) during the switchover. Plan for maintenance window.
# Private subnet resources affected: neo4j (10.42.101.200), ECS Fargate tasks
set -euo pipefail
export AWS_PROFILE=cig-520900722378
REGION="us-east-2"

# Infrastructure IDs
OLD_NAT_GW_ID="nat-07784153c342ff20d"
VPC_ID="vpc-09e7ab38ac34c3d5c"
PUBLIC_SUBNET_1="subnet-0cf334edd931dc69c"  # cig-api-public-1 (us-east-2a)
PRIVATE_RT_1="$(aws ec2 describe-route-tables --region $REGION \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=association.subnet-id,Values=subnet-0d4fcd53ab0d3ab7f" \
  --query 'RouteTables[0].RouteTableId' --output text)"
PRIVATE_RT_2="$(aws ec2 describe-route-tables --region $REGION \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=association.subnet-id,Values=subnet-02fd52dd07c3053f2" \
  --query 'RouteTables[0].RouteTableId' --output text)"

echo "Private route tables: $PRIVATE_RT_1, $PRIVATE_RT_2"

echo ""
echo "=== Step 1: Find latest Amazon Linux 2023 AMI for NAT instance ==="
NAT_AMI=$(aws ec2 describe-images \
  --region $REGION \
  --owners amazon \
  --filters \
    "Name=name,Values=amzn2-ami-kernel-*-hvm-*-x86_64-gp2" \
    "Name=state,Values=available" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text)
echo "NAT AMI: $NAT_AMI"

echo ""
echo "=== Step 2: Create security group for NAT instance ==="
NAT_SG_ID=$(aws ec2 create-security-group \
  --region $REGION \
  --group-name "cig-nat-instance-sg" \
  --description "NAT instance - allow private subnet traffic" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text 2>/dev/null || \
  aws ec2 describe-security-groups --region $REGION \
    --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=cig-nat-instance-sg" \
    --query 'SecurityGroups[0].GroupId' --output text)
echo "NAT SG: $NAT_SG_ID"

# Allow all traffic from private subnets (10.42.101.0/24 and 10.42.102.0/24)
aws ec2 authorize-security-group-ingress --region $REGION --group-id $NAT_SG_ID \
  --protocol all --cidr 10.42.101.0/24 2>/dev/null || true
aws ec2 authorize-security-group-ingress --region $REGION --group-id $NAT_SG_ID \
  --protocol all --cidr 10.42.102.0/24 2>/dev/null || true
# Allow HTTPS/HTTP outbound is already in default egress rules
echo "Security group rules set"

echo ""
echo "=== Step 3: Launch NAT instance ==="
NAT_INSTANCE_ID=$(aws ec2 run-instances \
  --region $REGION \
  --image-id $NAT_AMI \
  --instance-type t3.micro \
  --subnet-id $PUBLIC_SUBNET_1 \
  --security-group-ids $NAT_SG_ID \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=cig-api-nat-instance},{Key=cig-managed,Value=true}]' \
  --user-data '#!/bin/bash
    echo 1 > /proc/sys/net/ipv4/ip_forward
    echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf
    sysctl -p
    # Enable NAT masquerading for private subnets
    iptables -t nat -A POSTROUTING -o eth0 -s 10.42.101.0/24 -j MASQUERADE
    iptables -t nat -A POSTROUTING -o eth0 -s 10.42.102.0/24 -j MASQUERADE
    # Save iptables rules
    iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
  ' \
  --query 'Instances[0].InstanceId' --output text)
echo "NAT instance launched: $NAT_INSTANCE_ID"

echo ""
echo "=== Step 4: Disable source/destination check (required for NAT) ==="
aws ec2 wait instance-running --region $REGION --instance-ids $NAT_INSTANCE_ID
aws ec2 modify-instance-attribute \
  --region $REGION \
  --instance-id $NAT_INSTANCE_ID \
  --no-source-dest-check
echo "Source/dest check disabled"

NAT_PRIVATE_IP=$(aws ec2 describe-instances --region $REGION \
  --instance-ids $NAT_INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PrivateIpAddress' --output text)
echo "NAT instance private IP: $NAT_PRIVATE_IP"

echo ""
echo "=== Step 5: Update private route tables to use NAT instance ==="
echo "⚠️  This will cause ~30s interruption for private subnet traffic"
read -p "Proceed with route table update? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Paused. NAT instance is running but not yet routing traffic."
  echo "Re-run from Step 5 when ready."
  exit 0
fi

# Update route tables to use NAT instance instead of NAT gateway
for RT in $PRIVATE_RT_1 $PRIVATE_RT_2; do
  if [ -n "$RT" ] && [ "$RT" != "None" ]; then
    aws ec2 replace-route \
      --region $REGION \
      --route-table-id $RT \
      --destination-cidr-block 0.0.0.0/0 \
      --instance-id $NAT_INSTANCE_ID 2>/dev/null || \
    aws ec2 create-route \
      --region $REGION \
      --route-table-id $RT \
      --destination-cidr-block 0.0.0.0/0 \
      --instance-id $NAT_INSTANCE_ID
    echo "Route table $RT updated → $NAT_INSTANCE_ID"
  fi
done

echo ""
echo "=== Step 6: Verify connectivity (check from neo4j via SSM) ==="
aws ssm send-command \
  --region $REGION \
  --instance-ids i-0f517cca7b1b9bfe1 \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=["curl -s --max-time 5 https://checkip.amazonaws.com && echo OK"]' \
  --output json | python3 -c "
import json,sys
d=json.load(sys.stdin)
print('SSM Command ID:', d['Command']['CommandId'])
print('Wait 10s then check: aws ssm get-command-invocation --region us-east-2 --command-id', d['Command']['CommandId'], '--instance-id i-0f517cca7b1b9bfe1')
"

echo ""
echo "=== Step 7: Delete old NAT Gateway (after verifying connectivity) ==="
sleep 15
read -p "Connectivity verified? Delete old NAT Gateway? [y/N] " confirm2
if [[ "$confirm2" =~ ^[Yy]$ ]]; then
  aws ec2 delete-nat-gateway --region $REGION --nat-gateway-id $OLD_NAT_GW_ID --output json
  echo "NAT Gateway $OLD_NAT_GW_ID deletion initiated (takes ~1 minute)"
  echo ""
  echo "=== Release Elastic IP (after NAT GW deleted) ==="
  sleep 60
  EIP_ALLOC=$(aws ec2 describe-nat-gateways --region $REGION \
    --nat-gateway-ids $OLD_NAT_GW_ID \
    --query 'NatGateways[0].NatGatewayAddresses[0].AllocationId' --output text 2>/dev/null || true)
  if [ -n "$EIP_ALLOC" ] && [ "$EIP_ALLOC" != "None" ]; then
    aws ec2 release-address --region $REGION --allocation-id $EIP_ALLOC 2>/dev/null && echo "EIP released"
  fi
  echo "Savings: ~\$22/month"
fi
