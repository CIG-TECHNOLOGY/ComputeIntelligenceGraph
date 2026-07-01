# LLM Proxy Deployment Guide

This guide explains how to deploy the LLM Proxy using the automated CI/CD pipeline triggered by GitHub tags.

## Overview

The LLM Proxy deployment pipeline is triggered by creating a GitHub release with a tag matching the pattern `llm-proxy-v*.*.*`. The pipeline automatically:

1. **Detects changes** to LLM Proxy source code and infrastructure
2. **Validates** the code with linting and tests
3. **Builds** a Docker image and pushes it to ECR
4. **Provisions** base infrastructure (SQS, DynamoDB, Lambda, API Gateway, IAM, SNS, CloudWatch)
5. **Deploys** the Lambda function and API Gateway
6. **Runs smoke tests** to verify the deployment

## Prerequisites

### AWS Setup

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **IAM Role for GitHub Actions**: Create an IAM role that GitHub Actions can assume
   ```bash
   # Example role ARN: arn:aws:iam::ACCOUNT_ID:role/github-actions-llm-proxy-role
   ```
3. **S3 Bucket**: For SST state storage (created automatically during bootstrap)
4. **DynamoDB Table**: For SST state (created automatically during bootstrap)

### GitHub Setup

1. **Repository Secrets**: Configure the following secrets in your GitHub repository:
   - `AWS_ROLE_TO_ASSUME`: ARN of the IAM role for GitHub Actions
   - `DOCKERHUB_TOKEN`: Docker Hub authentication token (optional, for pushing to Docker Hub)

2. **Repository Variables**: Configure the following variables (optional):
   - `AWS_REGION`: AWS region (default: `us-east-2`)
   - `LLM_PROXY_DOMAIN`: Domain for the LLM Proxy (default: `llm-proxy.cig.technology`)
   - `LLM_PROXY_IMAGE_REPOSITORY`: ECR repository name (default: `llm-proxy-production`)
   - `DOCKERHUB_USERNAME`: Docker Hub username (default: `cigtechnology`)
   - `DOCKERHUB_LLM_PROXY_IMAGE`: Docker Hub image name (default: `llm-proxy`)

## Initial Bootstrap

Before deploying for the first time, you need to bootstrap the base infrastructure:

### Option 1: Using GitHub Actions (Recommended)

1. Go to **Actions** → **Deploy LLM Proxy**
2. Click **Run workflow**
3. Select **Workflow dispatch** and click **Run workflow**
4. Wait for the bootstrap to complete

### Option 2: Manual Bootstrap

```bash
# From the repository root
cd packages/llm-proxy

# Run the bootstrap script
bash scripts/bootstrap-llm-proxy.sh

# Or with custom settings
AWS_REGION=us-west-2 STAGE=staging bash scripts/bootstrap-llm-proxy.sh
```

## Deploying a Release

### Creating a Release

1. **Create a Git tag** with the format `llm-proxy-v*.*.*`:
   ```bash
   git tag llm-proxy-v1.0.0
   git push origin llm-proxy-v1.0.0
   ```

2. **Create a GitHub Release**:
   - Go to **Releases** → **Create a new release**
   - Select the tag you just created
   - Add release notes
   - Click **Publish release**

### Deployment Process

The deployment pipeline will automatically:

1. **Detect changes** to LLM Proxy files
2. **Validate** the code:
   - Run linting
   - Run tests
   - Build the application
3. **Build Docker image**:
   - Build the image with the tag `llm-proxy-v1.0.0`
   - Push to ECR and Docker Hub
4. **Provision infrastructure**:
   - Deploy SQS queues
   - Deploy DynamoDB table
   - Deploy Lambda function
   - Deploy API Gateway
   - Configure IAM roles
   - Set up CloudWatch alarms
5. **Run smoke tests**:
   - Test `/health` endpoint
   - Test `/v1/models` endpoint
6. **Generate summary**:
   - Display deployment details and available endpoints

### Monitoring Deployment

1. **GitHub Actions**: Watch the workflow run in the **Actions** tab
2. **AWS Console**: Monitor resources in the AWS console:
   - Lambda: `llm-proxy-lambda`
   - API Gateway: `llm-proxy-api`
   - SQS: `llm-proxy-request-queue`, `llm-proxy-response-queue`
   - DynamoDB: `llm-proxy-state`
3. **CloudWatch Logs**: View logs in CloudWatch:
   ```bash
   aws logs tail /aws/lambda/llm-proxy-lambda --follow
   ```

## Accessing the Deployed Service

Once deployed, the LLM Proxy is available at:

```
https://llm-proxy.cig.technology
```

### Available Endpoints

- **Health Check**: `GET /health`
- **Models**: `GET /v1/models`
- **Chat Completions**: `POST /v1/chat/completions`
- **Text Completions**: `POST /v1/completions`
- **Admin**: `GET /admin/sessions`
- **MCP Tools**: `GET /mcp/tools`

### Example Requests

```bash
# Health check
curl https://llm-proxy.cig.technology/health

# List models
curl https://llm-proxy.cig.technology/v1/models

# Chat completion (requires API key)
curl -X POST https://llm-proxy.cig.technology/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Troubleshooting

### Deployment Fails

1. **Check GitHub Actions logs**: Go to **Actions** → **Deploy LLM Proxy** → Click the failed run
2. **Check AWS CloudFormation**: Look for stack creation errors
3. **Check IAM permissions**: Ensure the GitHub Actions role has sufficient permissions

### Lambda Function Errors

```bash
# View Lambda logs
aws logs tail /aws/lambda/llm-proxy-lambda --follow

# Test Lambda locally
aws lambda invoke --function-name llm-proxy-lambda /tmp/response.json
cat /tmp/response.json
```

### API Gateway Issues

```bash
# Check API Gateway configuration
aws apigatewayv2 get-apis --query 'Items[?Name==`llm-proxy-api`]'

# View API Gateway logs
aws logs tail /aws/apigateway/llm-proxy-api --follow
```

### SQS Queue Issues

```bash
# Check queue attributes
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-2.amazonaws.com/ACCOUNT_ID/llm-proxy-request-queue \
  --attribute-names All

# View queue messages
aws sqs receive-message \
  --queue-url https://sqs.us-east-2.amazonaws.com/ACCOUNT_ID/llm-proxy-request-queue
```

## Rollback

To rollback to a previous version:

1. **Identify the previous tag**:
   ```bash
   git tag | grep llm-proxy | sort -V | tail -5
   ```

2. **Create a new release** with the previous tag:
   ```bash
   git tag llm-proxy-v1.0.0-rollback
   git push origin llm-proxy-v1.0.0-rollback
   ```

3. **Create a GitHub Release** with the rollback tag

## Monitoring and Alerts

### CloudWatch Alarms

The deployment creates the following CloudWatch alarms:

1. **Request Queue Depth**: Triggers when queue depth > 10 for 5 minutes
2. **Dead Letter Queue**: Triggers when DLQ has messages
3. **Lambda Errors**: Triggers when Lambda errors > 5 in 5 minutes

### SNS Notifications

Alarms send notifications to the SNS topic `llm-proxy-alerts`. Configure email subscriptions:

```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-2:ACCOUNT_ID:llm-proxy-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

## Cost Estimation

The LLM Proxy deployment uses AWS services within the free tier:

- **Lambda**: 1M invocations/month (free tier)
- **API Gateway**: 1M HTTP API calls/month (free tier)
- **SQS**: 1M requests/month (free tier)
- **DynamoDB**: 25 RCU/WCU on-demand (free tier)
- **CloudWatch**: 10 alarms (free tier)

**Estimated monthly cost**: $0 (within free tier)

## Advanced Configuration

### Custom Domain

To use a custom domain:

1. **Create a Route 53 hosted zone** (if not already created)
2. **Update GitHub variables**:
   - `LLM_PROXY_DOMAIN`: Your custom domain
   - `LLM_PROXY_HOSTED_ZONE_DOMAIN`: Your hosted zone domain
3. **Redeploy**: Create a new release to apply the changes

### Custom API Keys

To configure API keys:

1. **Set environment variables** in the Lambda function:
   ```bash
   aws lambda update-function-configuration \
     --function-name llm-proxy-lambda \
     --environment Variables={API_KEYS="key1,key2,key3"}
   ```

2. **Use API keys** in requests:
   ```bash
   curl -H "x-api-key: key1" https://llm-proxy.cig.technology/health
   ```

### Rate Limiting

To configure rate limiting:

1. **Update Lambda environment variables**:
   ```bash
   aws lambda update-function-configuration \
     --function-name llm-proxy-lambda \
     --environment Variables={RATE_LIMIT_PER_MINUTE="100"}
   ```

## Support

For issues or questions:

1. Check the [GitHub Issues](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues)
2. Review the [LLM Proxy Design Document](.kiro/specs/aws-native-llm-proxy/design.md)
3. Check the [LLM Proxy Requirements](.kiro/specs/aws-native-llm-proxy/requirements.md)
