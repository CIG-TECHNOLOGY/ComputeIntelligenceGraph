#!/usr/bin/env bash
# STEP 6: Migrate Secrets Manager → SSM Parameter Store
# Saves: ~$8/month (20 secrets × $0.40/month → free in SSM standard tier)
# NOTE: After migrating, update your app to use SSM SDK instead of Secrets Manager
# The secret NAMES are preserved exactly — just change the SDK call
set -euo pipefail
export AWS_PROFILE=cig-520900722378
REGION="us-east-2"

echo "=== Listing all Secrets Manager secrets ==="
aws secretsmanager list-secrets --region $REGION \
  --query 'SecretList[*].Name' --output table

echo ""
echo "=== Migrating secrets to SSM Parameter Store (SecureString) ==="

migrate_secret() {
  local secret_name="$1"
  echo "  Migrating: $secret_name"

  # Get secret value
  secret_value=$(aws secretsmanager get-secret-value \
    --secret-id "$secret_name" \
    --region $REGION \
    --query 'SecretString' \
    --output text 2>/dev/null)

  if [ -z "$secret_value" ]; then
    echo "    WARNING: Could not retrieve $secret_name — skipping"
    return
  fi

  # SSM path: convert / to / (keep same path structure)
  ssm_path="/$secret_name"

  # Put in SSM as SecureString
  aws ssm put-parameter \
    --name "$ssm_path" \
    --value "$secret_value" \
    --type "SecureString" \
    --overwrite \
    --region $REGION \
    --output json > /dev/null && echo "    ✓ SSM: $ssm_path"
}

# Migrate all secrets
while IFS= read -r secret_name; do
  [ -z "$secret_name" ] && continue
  migrate_secret "$secret_name"
done < <(aws secretsmanager list-secrets --region $REGION \
  --query 'SecretList[*].Name' --output text | tr '\t' '\n')

echo ""
echo "=== Verify SSM parameters created ==="
aws ssm describe-parameters \
  --region $REGION \
  --parameter-filters "Key=Type,Values=SecureString" \
  --query 'Parameters[*].{Name:Name,Type:Type}' \
  --output table

echo ""
echo "=== NEXT STEP: Update your app code ==="
echo ""
echo "Before (AWS SDK Secrets Manager):"
echo "  import boto3"
echo "  client = boto3.client('secretsmanager')"
echo "  secret = client.get_secret_value(SecretId='/cig/prod/api/database-url')['SecretString']"
echo ""
echo "After (SSM Parameter Store — same path):"
echo "  import boto3"
echo "  client = boto3.client('ssm')"
echo "  secret = client.get_parameter(Name='//cig/prod/api/database-url', WithDecryption=True)['Parameter']['Value']"
echo ""
echo "For NestJS (AWS SDK v3):"
echo "  import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm'"
echo "  const client = new SSMClient({ region: 'us-east-2' })"
echo "  const { Parameter } = await client.send(new GetParameterCommand({ Name: '//cig/prod/api/database-url', WithDecryption: true }))"
echo ""
echo "=== After updating app and deploying, delete Secrets Manager secrets ==="
echo "Run: bash 06b-delete-secrets-manager.sh"
