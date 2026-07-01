#!/bin/bash

# LLM Proxy GitHub Actions Setup Script
# This script automates the setup of GitHub Actions secrets and AWS IAM role

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GITHUB_REPO="${GITHUB_REPO:-CIG-TECHNOLOGY/ComputeIntelligenceGraph}"
AWS_REGION="${AWS_REGION:-us-east-2}"
IAM_ROLE_NAME="github-actions-llm-proxy-role"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  LLM Proxy GitHub Actions Setup                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

if ! command -v aws &> /dev/null; then
  echo -e "${RED}❌ AWS CLI not found. Please install it first.${NC}"
  exit 1
fi

if ! command -v gh &> /dev/null; then
  echo -e "${RED}❌ GitHub CLI not found. Please install it first.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ AWS CLI and GitHub CLI found${NC}"
echo ""

# Step 2: Get AWS account ID
echo -e "${YELLOW}Step 2: Getting AWS account ID...${NC}"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ -z "$ACCOUNT_ID" ]; then
  echo -e "${RED}❌ Failed to get AWS account ID. Check your AWS credentials.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ AWS Account ID: $ACCOUNT_ID${NC}"
echo ""

# Step 3: Create IAM role
echo -e "${YELLOW}Step 3: Creating IAM role for GitHub Actions...${NC}"

# Check if role already exists
if aws iam get-role --role-name "$IAM_ROLE_NAME" &> /dev/null; then
  echo -e "${YELLOW}⚠️  IAM role already exists: $IAM_ROLE_NAME${NC}"
else
  echo "Creating IAM role..."
  
  # Create trust policy document
  TRUST_POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_REPO}:*"
        }
      }
    }
  ]
}
EOF
)

  aws iam create-role \
    --role-name "$IAM_ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --description "GitHub Actions role for LLM Proxy CI/CD"
  
  echo -e "${GREEN}✅ IAM role created${NC}"
fi

# Step 4: Attach policy
echo -e "${YELLOW}Step 4: Attaching AdministratorAccess policy...${NC}"

if aws iam get-role-policy --role-name "$IAM_ROLE_NAME" --policy-name "AdministratorAccess" &> /dev/null; then
  echo -e "${YELLOW}⚠️  Policy already attached${NC}"
else
  aws iam attach-role-policy \
    --role-name "$IAM_ROLE_NAME" \
    --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
  
  echo -e "${GREEN}✅ Policy attached${NC}"
fi

echo ""

# Step 5: Get role ARN
echo -e "${YELLOW}Step 5: Getting IAM role ARN...${NC}"

ROLE_ARN=$(aws iam get-role \
  --role-name "$IAM_ROLE_NAME" \
  --query 'Role.Arn' \
  --output text)

echo -e "${GREEN}✅ Role ARN: $ROLE_ARN${NC}"
echo ""

# Step 6: Set GitHub secrets
echo -e "${YELLOW}Step 6: Setting GitHub repository secrets...${NC}"

echo "Setting AWS_ROLE_TO_ASSUME..."
gh secret set AWS_ROLE_TO_ASSUME --body "$ROLE_ARN"
echo -e "${GREEN}✅ AWS_ROLE_TO_ASSUME set${NC}"

# Optional: Set Docker Hub token
echo ""
echo -e "${YELLOW}Optional: Set Docker Hub token?${NC}"
read -p "Do you want to set DOCKERHUB_TOKEN? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  read -sp "Enter Docker Hub personal access token: " DOCKERHUB_TOKEN
  echo
  gh secret set DOCKERHUB_TOKEN --body "$DOCKERHUB_TOKEN"
  echo -e "${GREEN}✅ DOCKERHUB_TOKEN set${NC}"
fi

echo ""

# Step 7: Set GitHub variables
echo -e "${YELLOW}Step 7: Setting GitHub repository variables...${NC}"

gh variable set AWS_REGION --body "$AWS_REGION"
echo -e "${GREEN}✅ AWS_REGION set to $AWS_REGION${NC}"

gh variable set LLM_PROXY_DOMAIN --body "llm-proxy.cig.technology"
echo -e "${GREEN}✅ LLM_PROXY_DOMAIN set${NC}"

gh variable set LLM_PROXY_IMAGE_REPOSITORY --body "llm-proxy-production"
echo -e "${GREEN}✅ LLM_PROXY_IMAGE_REPOSITORY set${NC}"

gh variable set DOCKERHUB_USERNAME --body "cigtechnology"
echo -e "${GREEN}✅ DOCKERHUB_USERNAME set${NC}"

gh variable set DOCKERHUB_LLM_PROXY_IMAGE --body "llm-proxy"
echo -e "${GREEN}✅ DOCKERHUB_LLM_PROXY_IMAGE set${NC}"

gh variable set INFRA_APP_NAME --body "llm-proxy"
echo -e "${GREEN}✅ INFRA_APP_NAME set${NC}"

echo ""

# Step 8: Verify setup
echo -e "${YELLOW}Step 8: Verifying setup...${NC}"

echo "Secrets:"
gh secret list | grep -E "AWS_ROLE_TO_ASSUME|DOCKERHUB_TOKEN" || echo "No secrets found"

echo ""
echo "Variables:"
gh variable list | grep -E "AWS_REGION|LLM_PROXY|DOCKERHUB|INFRA_APP" || echo "No variables found"

echo ""

# Step 9: Summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Setup Complete!                                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ GitHub Actions is now configured!${NC}"
echo ""

echo "Next steps:"
echo "1. Verify secrets and variables in GitHub:"
echo "   https://github.com/$GITHUB_REPO/settings/secrets/actions"
echo ""
echo "2. Trigger deployment (choose one):"
echo "   a) Automatic: Push a new tag"
echo "      git tag llm-proxy-v0.1.4"
echo "      git push origin llm-proxy-v0.1.4"
echo ""
echo "   b) Manual: Go to Actions and run workflow"
echo "      https://github.com/$GITHUB_REPO/actions"
echo ""
echo "3. Monitor deployment:"
echo "   https://github.com/$GITHUB_REPO/actions"
echo ""
echo "4. Verify AWS resources after deployment:"
echo "   aws sqs list-queues --region $AWS_REGION"
echo "   aws dynamodb list-tables --region $AWS_REGION"
echo "   aws lambda list-functions --region $AWS_REGION"
echo ""

echo -e "${YELLOW}Documentation:${NC}"
echo "- Setup Checklist: .github/LLM_PROXY_SETUP_CHECKLIST.md"
echo "- GitHub Setup: .github/LLM_PROXY_GITHUB_SETUP.md"
echo "- CI/CD Orchestration: .github/LLM_PROXY_CICD_ORCHESTRATION.md"
echo ""
