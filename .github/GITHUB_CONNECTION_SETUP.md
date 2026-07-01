# GitHub CodeStar Connection Setup

## Connection Created ✅

A CodeStar Connection has been created to enable AWS CodePipeline to access your GitHub repository.

### Connection Details

| Property | Value |
|----------|-------|
| **Connection Name** | `github-cig` |
| **Connection ARN** | `arn:aws:codestar-connections:us-east-2:520900722378:connection/876488de-c75b-4f86-9e7d-2a268bf24e70` |
| **Provider** | GitHub |
| **Status** | PENDING (needs authorization) |
| **Account** | 520900722378 (CIG) |
| **Region** | us-east-2 |

## Authorization Steps

The connection needs to be authorized by connecting it to your GitHub account. Follow these steps:

### Option 1: AWS Console (Recommended)

1. Open AWS Console: https://console.aws.amazon.com/codesuite/connections/
2. Select region: **us-east-2**
3. Find connection: **github-cig**
4. Click **Update pending connection**
5. Click **Connect to GitHub**
6. **IMPORTANT:** Leave "App Installation" field BLANK
   - Clear any app installation ID by clicking the X button
   - This allows you to connect as a GitHub user instead of a bot
7. You'll be redirected to GitHub to authorize AWS
8. Click **Authorize AWS Connector for GitHub**
9. Grant permissions to access your repositories
10. Return to AWS Console - connection status should change to **AVAILABLE**

### Option 2: AWS CLI

```bash
# List pending connections
aws codestar-connections list-connections \
  --filter-criteria states=PENDING \
  --region us-east-2 \
  --profile aws-cig

# Get connection details
aws codestar-connections get-connection \
  --connection-arn arn:aws:codestar-connections:us-east-2:520900722378:connection/876488de-c75b-4f86-9e7d-2a268bf24e70 \
  --region us-east-2 \
  --profile aws-cig
```

## What Happens After Authorization

Once the connection is authorized:

1. **Pipeline Activation** - The CodePipeline will be ready to use
2. **GitHub Integration** - AWS can access your repository
3. **Automatic Triggers** - Pushes to `main` branch will trigger the pipeline
4. **Build & Deploy** - CodeBuild will automatically build and deploy your code

## Pipeline Trigger

After authorization, the pipeline will automatically trigger on:

- **Branch:** `main`
- **Event:** Push to repository
- **Action:** Starts Source → Validate → Build → Deploy stages

## Verify Connection Status

```bash
# Check if connection is AVAILABLE
aws codestar-connections get-connection \
  --connection-arn arn:aws:codestar-connections:us-east-2:520900722378:connection/876488de-c75b-4f86-9e7d-2a268bf24e70 \
  --region us-east-2 \
  --profile aws-cig
```

Expected output when authorized:
```json
{
    "Connection": {
        "ConnectionName": "github-cig",
        "ConnectionArn": "arn:aws:codestar-connections:us-east-2:520900722378:connection/876488de-c75b-4f86-9e7d-2a268bf24e70",
        "ProviderType": "GitHub",
        "OwnerAccountId": "520900722378",
        "ConnectionStatus": "AVAILABLE"
    }
}
```

## Troubleshooting

### Connection Still Pending

If the connection remains in PENDING status:

1. Check GitHub OAuth app permissions
2. Verify your GitHub account has access to the repository
3. Try authorizing again through AWS Console

### Pipeline Not Triggering

If the pipeline doesn't trigger on push:

1. Verify connection status is AVAILABLE
2. Check that you're pushing to the `main` branch
3. Verify repository name and owner in pipeline configuration
4. Check CodePipeline execution history for errors

## Repository Configuration

The pipeline is configured to use:

| Setting | Value |
|---------|-------|
| **Repository Owner** | `edwardcalderon` |
| **Repository Name** | `ComputeIntelligenceGraph` |
| **Branch** | `main` |
| **Connection** | `github-cig` |

## Next Steps

1. ✅ CodeStar Connection created
2. ⏳ **Authorize connection** (you are here)
3. Push code to `main` branch to trigger pipeline
4. Monitor pipeline execution in AWS Console
5. Verify Lambda deployment

## Support

For issues with GitHub connection:

- AWS Documentation: https://docs.aws.amazon.com/dtconsole/latest/userguide/connections.html
- GitHub OAuth: https://docs.github.com/en/developers/apps/building-oauth-apps

---

**Created:** April 30, 2026  
**Connection ARN:** `arn:aws:codestar-connections:us-east-2:520900722378:connection/876488de-c75b-4f86-9e7d-2a268bf24e70`  
**Account:** 520900722378 (CIG)  
**Region:** us-east-2


## Troubleshooting

### Error: "You don't have permission to create the connection"

**Cause:** An app installation ID is set that you don't have access to.

**Solution:**
1. Click the **X** button to clear the "App Installation" field
2. Leave it blank
3. This allows you to connect as a GitHub user instead of a bot
4. Try authorizing again

### Connection Still Pending

If the connection remains in PENDING status:

1. Check GitHub OAuth app permissions
2. Verify your GitHub account has access to the repository
3. Try authorizing again through AWS Console

### Pipeline Not Triggering

If the pipeline doesn't trigger on push:

1. Verify connection status is AVAILABLE
2. Check that you're pushing to the `main` branch
3. Verify repository name: `CIG-TECHNOLOGY/ComputeIntelligenceGraph`
4. Check CodePipeline execution history for errors
