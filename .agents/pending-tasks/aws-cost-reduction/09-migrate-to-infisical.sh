#!/usr/bin/env bash
# Migrate all AWS Secrets Manager secrets → Infisical (secrets.cig.technology)
#
# PREREQUISITES:
#   1. infisical CLI logged in: infisical login --domain https://secrets.cig.technology/api
#   2. Set INFISICAL_PROJECT_ID below (get from Infisical UI → Project Settings)
#   3. Set AWS_PROFILE to the CIG account
#
# HOW IT ORGANIZES SECRETS IN INFISICAL:
#   /cig/prod/api/*          → project "cig-api", env "prod", folder /api
#   authentik/.../*          → project "cig-api", env "prod", folder /authentik
#   cig-api/neo4j/*          → project "cig-api", env "prod", folder /neo4j
#   monitor/status.*/*       → project "cig-api", env "prod", folder /monitor
#   (infisical/* skipped — circular dependency)
set -euo pipefail

export AWS_PROFILE="${AWS_PROFILE:-cig-520900722378}"
REGION="us-east-2"
INFISICAL_DOMAIN="https://secrets.cig.technology/api"
INFISICAL_ENV="prod"

# ╔══════════════════════════════════════════╗
# ║  SET THIS: get from Infisical UI         ║
# ║  Project Settings → Project ID           ║
# ╚══════════════════════════════════════════╝
INFISICAL_PROJECT_ID="${INFISICAL_PROJECT_ID:-}"

if [ -z "$INFISICAL_PROJECT_ID" ]; then
  echo "ERROR: Set INFISICAL_PROJECT_ID before running."
  echo "  Get it from: https://secrets.cig.technology → Project → Settings → Project ID"
  echo ""
  echo "  Then run:"
  echo "    INFISICAL_PROJECT_ID=your-project-id bash 09-migrate-to-infisical.sh"
  exit 1
fi

echo "=== CIG AWS Secrets Manager → Infisical Migration ==="
echo "  AWS account:        $AWS_PROFILE"
echo "  Infisical domain:   $INFISICAL_DOMAIN"
echo "  Infisical project:  $INFISICAL_PROJECT_ID"
echo "  Infisical env:      $INFISICAL_ENV"
echo ""

# Derive Infisical folder and secret name from AWS secret path
get_folder_and_key() {
  local aws_name="$1"
  local folder key

  case "$aws_name" in
    /cig/prod/api/*)
      folder="/api"
      key="${aws_name##*/cig/prod/api/}"
      ;;
    authentik/*)
      folder="/authentik"
      # e.g. authentik/auth.cig.technology/v2/oidc-client → oidc-client
      key="${aws_name##authentik/auth.cig.technology/v2/}"
      ;;
    cig-api/neo4j/*)
      folder="/neo4j"
      key="${aws_name##cig-api/neo4j/}"
      ;;
    /cig/prod/api/neo4j-*)
      folder="/neo4j"
      key="${aws_name##*/cig/prod/api/}"
      ;;
    monitor/*)
      folder="/monitor"
      key="${aws_name##monitor/status.cig.technology/}"
      ;;
    infisical/*)
      echo "SKIP"
      return
      ;;
    *)
      folder="/misc"
      key="${aws_name##*/}"
      ;;
  esac

  # Normalize key: replace - with _ and uppercase
  key=$(echo "$key" | tr '-' '_' | tr '[:lower:]' '[:upper:]')
  echo "$folder/$key"
}

SUCCESS=0
SKIP=0
FAIL=0

# Get all secret names
SECRETS=$(aws secretsmanager list-secrets --region $REGION \
  --query 'SecretList[*].Name' --output text | tr '\t' '\n')

while IFS= read -r secret_name; do
  [ -z "$secret_name" ] && continue

  # Determine destination
  dest=$(get_folder_and_key "$secret_name")
  if [ "$dest" = "SKIP" ]; then
    echo "  SKIP (infisical self-referential): $secret_name"
    ((SKIP++))
    continue
  fi

  folder=$(dirname "$dest")
  key=$(basename "$dest")

  # Get secret value (never printed to stdout)
  secret_value=$(aws secretsmanager get-secret-value \
    --secret-id "$secret_name" \
    --region $REGION \
    --query 'SecretString' \
    --output text 2>/dev/null)

  if [ -z "$secret_value" ] || [ "$secret_value" = "None" ]; then
    echo "  SKIP (no value): $secret_name"
    ((SKIP++))
    continue
  fi

  # Create folder if needed (idempotent)
  infisical secrets folders create \
    --name "$(basename $folder)" \
    --path "$(dirname $folder)" \
    --projectId "$INFISICAL_PROJECT_ID" \
    --env "$INFISICAL_ENV" \
    --domain "$INFISICAL_DOMAIN" \
    --silent 2>/dev/null || true

  # Set secret in Infisical (value piped, never appears in terminal)
  result=$(infisical secrets set \
    "${key}=${secret_value}" \
    --projectId "$INFISICAL_PROJECT_ID" \
    --env "$INFISICAL_ENV" \
    --path "$folder" \
    --domain "$INFISICAL_DOMAIN" \
    --silent 2>&1)

  if [ $? -eq 0 ]; then
    echo "  ✓ $folder/$key  ←  $secret_name"
    ((SUCCESS++))
  else
    echo "  ✗ FAILED $secret_name: $result"
    ((FAIL++))
  fi

done <<< "$SECRETS"

echo ""
echo "════════════════════════════════════"
echo "Migration complete: $SUCCESS imported, $SKIP skipped, $FAIL failed"
echo ""
echo "View at: https://secrets.cig.technology → project → env: prod"
echo ""
echo "NEXT: Update your app (ECS task definition) to use Infisical:"
echo "  Option A — Infisical Agent sidecar (zero code changes):"
echo "    See: https://infisical.com/docs/integrations/platforms/ecs"
echo ""
echo "  Option B — Infisical SDK in NestJS:"
echo "    npm install @infisical/sdk"
echo "    import { InfisicalClient } from '@infisical/sdk'"
echo ""
echo "After confirming app works with Infisical, delete from AWS Secrets Manager:"
echo "  bash 06b-delete-secrets-manager.sh"
