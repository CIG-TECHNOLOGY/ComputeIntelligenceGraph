# LLM Proxy Monitoring Dashboard

## Release Status

**Current Release:** `llm-proxy-v0.1.2`  
**Status:** ✅ **LIVE**  
**Deployment Started:** April 28, 2026  
**Expected Completion:** ~35 minutes from deployment start

## Release History

| Version | Status | Date | Notes |
|---------|--------|------|-------|
| v0.1.0 | ✅ Deployed | Apr 28 | Initial release |
| v0.1.1 | ✅ Deployed | Apr 28 | Patch release |
| v0.1.2 | ✅ Live | Apr 28 | Current patch release |

## GitHub Actions Monitoring

### Active Workflows

**1. Setup LLM Proxy CI/CD Pipeline**
- **File:** `.github/workflows/setup-llm-proxy-cicd.yml`
- **Status:** Check GitHub Actions
- **Duration:** 10-15 minutes
- **Jobs:**
  - Check infrastructure status
  - Setup AWS base layer
  - Deploy SST infrastructure
  - Validate infrastructure
  - Generate setup summary

**2. LLM Proxy Release Pipeline**
- **File:** `.github/workflows/llm-proxy-release.yml`
- **Status:** Check GitHub Actions
- **Duration:** 15-20 minutes
- **Jobs:**
  - Setup CI/CD verification
  - Detect changes
  - Validate code
  - Build Docker image
  - Deploy infrastructure
  - Run smoke tests
  - Generate release summary

### View Workflows

**GitHub Actions Dashboard:**
https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/actions

**Steps:**
1. Go to Actions tab
2. Look for "Setup LLM Proxy CI/CD Pipeline" and "LLM Proxy Release Pipeline"
3. Click on workflow to view real-time logs
4. Check job summaries for deployment details

## AWS Resource Monitoring

### SQS Queues

**Queues Created:**
- `llm-proxy-request-queue` - Inference requests
- `llm-proxy-response-queue` - Inference responses
- `llm-proxy-dlq` - Dead letter queue

**Monitor:**
```bash
# Get queue attributes
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-2.amazonaws.com/ACCOUNT_ID/llm-proxy-request-queue \
  --attribute-names All

# Get queue metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/SQS \
  --metric-name ApproximateNumberOfMessagesVisible \
  --dimensions Name=QueueName,Value=llm-proxy-request-queue \
  --start-time 2026-04-28T00:00:00Z \
  --end-time 2026-04-28T23:59:59Z \
  --period 300 \
  --statistics Average
```

**Key Metrics:**
- ApproximateNumberOfMessages
- ApproximateNumberOfMessagesDelayed
- ApproximateNumberOfMessagesNotVisible
- NumberOfMessagesSent
- NumberOfMessagesReceived
- NumberOfMessagesDeleted

### DynamoDB Table

**Table Created:**
- `llm-proxy-state` - Worker session state

**Monitor:**
```bash
# Describe table
aws dynamodb describe-table --table-name llm-proxy-state

# Get table metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=llm-proxy-state \
  --start-time 2026-04-28T00:00:00Z \
  --end-time 2026-04-28T23:59:59Z \
  --period 300 \
  --statistics Sum
```

**Key Metrics:**
- ConsumedWriteCapacityUnits
- ConsumedReadCapacityUnits
- UserErrors
- SystemErrors
- SuccessfulRequestLatency

### Lambda Function

**Function Created:**
- `llm-proxy-lambda` - Main inference handler

**Monitor:**
```bash
# Get function info
aws lambda get-function --function-name llm-proxy-lambda

# Get function metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=llm-proxy-lambda \
  --start-time 2026-04-28T00:00:00Z \
  --end-time 2026-04-28T23:59:59Z \
  --period 300 \
  --statistics Sum
```

**Key Metrics:**
- Invocations
- Errors
- Duration
- Throttles
- ConcurrentExecutions
- UnreservedConcurrentExecutions

### API Gateway

**API Created:**
- `llm-proxy-api` - HTTP API

**Monitor:**
```bash
# Get API metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=llm-proxy-api \
  --start-time 2026-04-28T00:00:00Z \
  --end-time 2026-04-28T23:59:59Z \
  --period 300 \
  --statistics Sum
```

**Key Metrics:**
- Count (total requests)
- 4XXError (client errors)
- 5XXError (server errors)
- Latency (response time)
- IntegrationLatency

## CloudWatch Logs

### Lambda Logs

**Log Group:** `/aws/lambda/llm-proxy-lambda`

**View Logs:**
```bash
# Tail logs in real-time
aws logs tail /aws/lambda/llm-proxy-lambda --follow

# View logs from specific time
aws logs filter-log-events \
  --log-group-name /aws/lambda/llm-proxy-lambda \
  --start-time $(date -d '1 hour ago' +%s)000

# Search for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/llm-proxy-lambda \
  --filter-pattern "ERROR"
```

### CloudWatch Alarms

**Alarms Created:**
1. Request Queue Depth > 10 for 5 minutes
2. DLQ Messages Visible > 0
3. Heartbeat Age > 120 seconds

**View Alarms:**
```bash
# List alarms
aws cloudwatch describe-alarms --alarm-name-prefix llm-proxy

# Get alarm history
aws cloudwatch describe-alarm-history \
  --alarm-name llm-proxy-request-queue-depth
```

## Endpoint Verification

### Health Endpoint

**URL:** `GET https://llm-proxy.cig.technology/health`

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-04-28T15:30:00Z",
  "worker": {
    "status": "active",
    "sessionId": "session-123",
    "lastHeartbeat": "2026-04-28T15:30:00Z"
  }
}
```

**Test:**
```bash
curl https://llm-proxy.cig.technology/health
```

### Models Endpoint

**URL:** `GET https://llm-proxy.cig.technology/v1/models`

**Expected Response:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "model-name",
      "object": "model",
      "owned_by": "ollama"
    }
  ]
}
```

**Test:**
```bash
curl https://llm-proxy.cig.technology/v1/models
```

### Admin Endpoint

**URL:** `GET https://llm-proxy.cig.technology/admin/sessions`

**Expected Response:**
```json
{
  "sessions": [
    {
      "sessionId": "session-123",
      "status": "active",
      "startedAt": "2026-04-28T15:00:00Z",
      "lastHeartbeat": "2026-04-28T15:30:00Z"
    }
  ]
}
```

**Test:**
```bash
curl https://llm-proxy.cig.technology/admin/sessions
```

## Monitoring Checklist

### GitHub Actions
- [ ] Setup workflow started
- [ ] Setup workflow completed successfully
- [ ] Release workflow started
- [ ] Code validation passed
- [ ] Docker image built successfully
- [ ] Infrastructure deployed successfully
- [ ] Smoke tests passed
- [ ] Release workflow completed

### AWS Resources
- [ ] SQS queues created and accessible
- [ ] DynamoDB table created and active
- [ ] Lambda function deployed and active
- [ ] API Gateway configured and responding
- [ ] IAM roles created with correct permissions
- [ ] SNS topic created for alerts
- [ ] CloudWatch alarms configured
- [ ] ECR image pushed successfully

### Endpoints
- [ ] /health endpoint responding (200)
- [ ] /v1/models endpoint responding (200)
- [ ] /admin/sessions endpoint responding (200)
- [ ] CloudWatch logs available
- [ ] No errors in Lambda logs

## Troubleshooting

### Workflow Fails

**Problem:** GitHub Actions workflow fails

**Solution:**
1. Check GitHub Actions logs for error details
2. Review the specific job that failed
3. Check AWS console for resource creation errors
4. Verify IAM role has required permissions

### Endpoints Not Responding

**Problem:** Cannot reach https://llm-proxy.cig.technology

**Solution:**
1. Verify API Gateway is deployed
2. Check Route 53 DNS records
3. Verify SSL certificate is valid
4. Check CloudWatch logs for errors

### High Error Rate

**Problem:** Lambda returning 5XX errors

**Solution:**
1. Check CloudWatch logs for error details
2. Verify SQS queues are accessible
3. Check DynamoDB table is active
4. Verify IAM permissions are correct

### Slow Response Times

**Problem:** API responses are slow

**Solution:**
1. Check Lambda duration metrics
2. Check SQS queue depth
3. Check DynamoDB consumed capacity
4. Review CloudWatch logs for bottlenecks

## Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Latency | < 1s | > 5s |
| Lambda Duration | < 500ms | > 2s |
| Error Rate | < 1% | > 5% |
| Queue Depth | < 10 | > 50 |
| DLQ Messages | 0 | > 0 |
| Heartbeat Age | < 120s | > 180s |

## Documentation

- [Deployment Status](./DEPLOYMENT_STATUS.md)
- [CI/CD Index](./LLM_PROXY_CICD_INDEX.md)
- [Quick Start](./LLM_PROXY_QUICK_START.md)
- [Orchestration Guide](./LLM_PROXY_CICD_ORCHESTRATION.md)

## Support

For issues:
1. Check GitHub Actions logs
2. Review AWS CloudWatch logs
3. Consult troubleshooting guides
4. Check AWS console for resource status

---

**Last Updated:** April 28, 2026  
**Release:** llm-proxy-v0.1.2  
**Status:** ✅ Live
