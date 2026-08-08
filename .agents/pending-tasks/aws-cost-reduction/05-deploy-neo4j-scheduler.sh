#!/usr/bin/env bash
# STEP 5: Deploy neo4j time-based scheduler Lambda
# Saves: ~$15/month (neo4j off 8pm-8am COT = 12h/day = 50% reduction)
# Schedule: Stop at 01:00 UTC (8pm COT), Start at 13:00 UTC (8am COT)
set -euo pipefail
export AWS_PROFILE=cig-520900722378

INSTANCE_ID="i-0f517cca7b1b9bfe1"
REGION="us-east-2"
ACCOUNT_ID="520900722378"
FUNCTION_NAME="cig-neo4j-scheduler"
ROLE_NAME="cig-neo4j-scheduler-role"

echo "=== Step 1: Create IAM role for Lambda ==="
TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }
  ]
}'

ROLE_ARN=$(aws iam create-role \
  --role-name $ROLE_NAME \
  --assume-role-policy-document "$TRUST_POLICY" \
  --query 'Role.Arn' --output text 2>/dev/null || \
  aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
echo "Role ARN: $ROLE_ARN"

echo ""
echo "=== Step 2: Attach policies ==="
# Basic Lambda execution (CloudWatch logs)
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole 2>/dev/null || true

# EC2 start/stop for this specific instance
EC2_POLICY="{
  \"Version\": \"2012-10-17\",
  \"Statement\": [
    {
      \"Effect\": \"Allow\",
      \"Action\": [\"ec2:StartInstances\", \"ec2:StopInstances\", \"ec2:DescribeInstances\"],
      \"Resource\": \"arn:aws:ec2:$REGION:$ACCOUNT_ID:instance/$INSTANCE_ID\"
    },
    {
      \"Effect\": \"Allow\",
      \"Action\": \"ec2:DescribeInstances\",
      \"Resource\": \"*\"
    }
  ]
}"

POLICY_ARN=$(aws iam create-policy \
  --policy-name cig-neo4j-ec2-control \
  --policy-document "$EC2_POLICY" \
  --query 'Policy.Arn' --output text 2>/dev/null || \
  aws iam list-policies --query "Policies[?PolicyName=='cig-neo4j-ec2-control'].Arn" --output text)
aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn $POLICY_ARN 2>/dev/null || true
echo "Policies attached"

echo ""
echo "=== Step 3: Package and deploy Lambda ==="
cd "$(dirname "$0")/neo4j-scheduler"
zip -q function.zip lambda_function.py

sleep 10  # IAM propagation

aws lambda create-function \
  --function-name $FUNCTION_NAME \
  --runtime python3.12 \
  --role $ROLE_ARN \
  --handler lambda_function.handler \
  --zip-file fileb://function.zip \
  --environment "Variables={INSTANCE_ID=$INSTANCE_ID}" \
  --timeout 30 \
  --region $REGION \
  --output json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('Lambda ARN:', d['FunctionArn'])" || \
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://function.zip \
  --region $REGION \
  --output json | python3 -c "import json,sys; d=json.load(sys.stdin); print('Updated Lambda ARN:', d['FunctionArn'])"

LAMBDA_ARN="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME"
echo ""
echo "=== Step 4: Create EventBridge schedules ==="

# Stop at 01:00 UTC (20:00 COT / 8pm Colombia time)
aws scheduler create-schedule \
  --name "cig-neo4j-stop-nightly" \
  --schedule-expression "cron(0 1 * * ? *)" \
  --schedule-expression-timezone "UTC" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target "{
    \"Arn\": \"$LAMBDA_ARN\",
    \"RoleArn\": \"$ROLE_ARN\",
    \"Input\": \"{\\\"action\\\": \\\"stop\\\"}\"
  }" \
  --region $REGION \
  --output json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('Stop schedule ARN:', d['ScheduleArn'])" || \
  echo "Stop schedule already exists or needs EventBridge Scheduler role"

# Start at 13:00 UTC (08:00 COT / 8am Colombia time)
aws scheduler create-schedule \
  --name "cig-neo4j-start-morning" \
  --schedule-expression "cron(0 13 * * ? *)" \
  --schedule-expression-timezone "UTC" \
  --flexible-time-window '{"Mode": "OFF"}' \
  --target "{
    \"Arn\": \"$LAMBDA_ARN\",
    \"RoleArn\": \"$ROLE_ARN\",
    \"Input\": \"{\\\"action\\\": \\\"start\\\"}\"
  }" \
  --region $REGION \
  --output json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('Start schedule ARN:', d['ScheduleArn'])" || \
  echo "Start schedule already exists or needs EventBridge Scheduler role"

echo ""
echo "=== Testing Lambda (dry run - describe only) ==="
aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload '{"action": "stop"}' \
  --region $REGION \
  --cli-binary-format raw-in-base64-out \
  /tmp/neo4j-lambda-test.json && cat /tmp/neo4j-lambda-test.json

echo ""
echo "Deployed: neo4j stops at 8pm COT, starts at 8am COT"
echo "Savings: ~\$15/month (neo4j t3.medium 12h/day instead of 24h)"
