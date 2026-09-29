#!/bin/bash

# Bootstrap script for LLM Proxy infrastructure
# Provisions base layer infrastructure (SQS, DynamoDB, Lambda, API Gateway, IAM, SNS, CloudWatch)
# Optionally creates AWS CodePipeline for continuous deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
INFRA_DIR="$SCRIPT_DIR/.."

# Environment variables
BOOTSTRAP_ONLY="${INFRA_LLM_PROXY_BOOTSTRAP_ONLY:-false}"
CREATE_PIPELINES="${INFRA_CREATE_PIPELINES:-false}"
AWS_REGION="${AWS_REGION:-us-east-2}"
STAGE="${STAGE:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $*"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*"
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."

  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed"
    exit 1
  fi

  if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
  fi

  if ! command -v pnpm &> /dev/null; then
    log_error "pnpm is not installed"
    exit 1
  fi

  log_info "Prerequisites check passed"
}

# Verify AWS credentials
verify_aws_credentials() {
  log_info "Verifying AWS credentials..."

  if ! aws sts get-caller-identity &> /dev/null; then
    log_error "AWS credentials are not configured or invalid"
    exit 1
  fi

  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  log_info "AWS Account ID: $ACCOUNT_ID"
}

# Create S3 bucket for SST state
create_sst_state_bucket() {
  log_info "Creating S3 bucket for SST state..."

  BUCKET_NAME="llm-proxy-sst-state-${ACCOUNT_ID}-${AWS_REGION}"

  if aws s3 ls "s3://$BUCKET_NAME" 2>/dev/null; then
    log_info "S3 bucket already exists: $BUCKET_NAME"
  else
    log_info "Creating S3 bucket: $BUCKET_NAME"
    aws s3 mb "s3://$BUCKET_NAME" --region "$AWS_REGION"
    
    # Enable versioning
    aws s3api put-bucket-versioning \
      --bucket "$BUCKET_NAME" \
      --versioning-configuration Status=Enabled
    
    # Block public access
    aws s3api put-public-access-block \
      --bucket "$BUCKET_NAME" \
      --public-access-block-configuration \
      "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
    
    log_info "S3 bucket created and configured: $BUCKET_NAME"
  fi

  export SST_STATE_BUCKET="$BUCKET_NAME"
}

# Create DynamoDB table for SST state
create_sst_state_table() {
  log_info "Creating DynamoDB table for SST state..."

  TABLE_NAME="llm-proxy-sst-state"

  if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$AWS_REGION" 2>/dev/null; then
    log_info "DynamoDB table already exists: $TABLE_NAME"
  else
    log_info "Creating DynamoDB table: $TABLE_NAME"
    aws dynamodb create-table \
      --table-name "$TABLE_NAME" \
      --attribute-definitions \
        AttributeName=id,AttributeType=S \
      --key-schema \
        AttributeName=id,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --region "$AWS_REGION"
    
    # Wait for table to be created
    aws dynamodb wait table-exists --table-name "$TABLE_NAME" --region "$AWS_REGION"
    log_info "DynamoDB table created: $TABLE_NAME"
  fi

  export SST_STATE_TABLE="$TABLE_NAME"
}

# Deploy base infrastructure with SST
deploy_base_infrastructure() {
  log_info "Deploying base infrastructure with SST..."

  cd "$INFRA_DIR"

  export INFRA_LLM_PROXY_BOOTSTRAP_ONLY="$BOOTSTRAP_ONLY"
  export INFRA_CREATE_PIPELINES="$CREATE_PIPELINES"
  export AWS_REGION="$AWS_REGION"

  # Load environment variables from root .env
  if [ -f "$PROJECT_ROOT/.env" ]; then
    log_info "Loading environment variables from $PROJECT_ROOT/.env"
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
  fi

  if [ "$BOOTSTRAP_ONLY" = "true" ]; then
    log_info "Running in bootstrap-only mode"
  fi

  if [ "$CREATE_PIPELINES" = "true" ]; then
    log_info "Creating AWS CodePipeline for continuous deployment"
  fi

  # Install dependencies
  log_info "Installing dependencies..."
  pnpm install --frozen-lockfile

  # Deploy infrastructure
  log_info "Deploying infrastructure..."
  pnpm exec sst deploy --stage "$STAGE" --yes

  log_info "Base infrastructure deployed successfully"
}

# Create CodePipeline for continuous deployment
create_codepipeline() {
  if [ "$CREATE_PIPELINES" != "true" ]; then
    return
  fi

  log_info "Creating AWS CodePipeline for LLM Proxy..."

  PIPELINE_NAME="llm-proxy-deployment-pipeline"
  REPOSITORY_NAME="ComputeIntelligenceGraph"
  REPOSITORY_OWNER="CIG-TECHNOLOGY"
  REPOSITORY_BRANCH="main"

  # Check if pipeline already exists
  if aws codepipeline get-pipeline --name "$PIPELINE_NAME" --region "$AWS_REGION" 2>/dev/null; then
    log_info "CodePipeline already exists: $PIPELINE_NAME"
    return
  fi

  log_info "Creating CodePipeline: $PIPELINE_NAME"

  # Create IAM role for CodePipeline
  PIPELINE_ROLE_NAME="llm-proxy-codepipeline-role"
  
  if ! aws iam get-role --role-name "$PIPELINE_ROLE_NAME" 2>/dev/null; then
    log_info "Creating IAM role for CodePipeline: $PIPELINE_ROLE_NAME"
    
    aws iam create-role \
      --role-name "$PIPELINE_ROLE_NAME" \
      --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Principal": {
              "Service": "codepipeline.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
          }
        ]
      }'
    
    # Attach policies
    aws iam attach-role-policy \
      --role-name "$PIPELINE_ROLE_NAME" \
      --policy-arn "arn:aws:iam::aws:policy/AdministratorAccess"
  fi

  log_info "CodePipeline setup complete"
}

# Generate deployment summary
generate_summary() {
  log_info "Generating deployment summary..."

  cat << EOF

${GREEN}=== LLM Proxy Bootstrap Complete ===${NC}

${GREEN}Base Infrastructure:${NC}
  - SQS Queues: llm-proxy-request-queue, llm-proxy-response-queue, llm-proxy-dlq
  - DynamoDB Table: llm-proxy-state
  - Lambda Function: llm-proxy-lambda
  - API Gateway: llm-proxy-api
  - IAM Roles: llm-proxy-lambda-role, llm-proxy-worker-user
  - SNS Topic: llm-proxy-alerts
  - CloudWatch Alarms: 3 alarms configured

${GREEN}AWS Region:${NC}
  - $AWS_REGION

${GREEN}Stage:${NC}
  - $STAGE

${GREEN}Next Steps:${NC}
  1. Configure GitHub repository secrets:
     - AWS_ROLE_TO_ASSUME: ARN of the IAM role for GitHub Actions
     - DOCKERHUB_TOKEN: Docker Hub authentication token

  2. Create a GitHub release with tag format: llm-proxy-v*.*.*
     Example: llm-proxy-v1.0.0

  3. The deployment pipeline will automatically:
     - Build and push Docker image to ECR
     - Deploy Lambda function
     - Update API Gateway
     - Run smoke tests

${GREEN}Useful Commands:${NC}
  - View deployment: pnpm --filter @llm-proxy/app diff:prod
  - Deploy manually: pnpm --filter @llm-proxy/app deploy:prod
  - View logs: aws logs tail /aws/lambda/llm-proxy-lambda --follow

EOF
}

# Main execution
main() {
  log_info "Starting LLM Proxy infrastructure bootstrap..."

  check_prerequisites
  verify_aws_credentials
  create_sst_state_bucket
  create_sst_state_table
  deploy_base_infrastructure
  create_codepipeline
  generate_summary

  log_info "Bootstrap complete!"
}

main "$@"
