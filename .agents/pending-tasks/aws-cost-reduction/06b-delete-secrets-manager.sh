#!/usr/bin/env bash
# STEP 6b: Delete Secrets Manager secrets (run AFTER app migrated to SSM)
# Only run this after deploying app changes that use SSM instead
set -euo pipefail
export AWS_PROFILE=cig-520900722378
REGION="us-east-2"

echo "=== Secrets to be deleted ==="
aws secretsmanager list-secrets --region $REGION \
  --query 'SecretList[*].Name' --output table

echo ""
read -p "Have you deployed the app with SSM instead of Secrets Manager? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted. Update the app first, then re-run."
  exit 1
fi

while IFS= read -r secret_name; do
  [ -z "$secret_name" ] && continue
  echo "Deleting: $secret_name"
  aws secretsmanager delete-secret \
    --secret-id "$secret_name" \
    --force-delete-without-recovery \
    --region $REGION \
    --output json > /dev/null && echo "  ✓ Deleted $secret_name"
done < <(aws secretsmanager list-secrets --region $REGION \
  --query 'SecretList[*].Name' --output text | tr '\t' '\n')

echo ""
echo "All secrets deleted. Savings: ~\$8/month"
