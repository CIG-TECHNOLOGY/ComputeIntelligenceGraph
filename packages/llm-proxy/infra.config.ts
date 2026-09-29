/// <reference path="./sst-env.d.ts" />

import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

type PipelinePermissionsMode = 'admin' | 'least-privilege';

interface LLMProxyStackConfig {
  appName: string;
  stage: string;
  region: string;
  domain: string;
  hostedZoneDomain: string;
  imageRepository: string;
  imageUri: string;
  lambdaMemoryMb: number;
  lambdaTimeoutSeconds: number;
  bootstrapOnly: boolean;
  createPipelines: boolean;
  certificateArn?: string;
  projectTag: string;
  pipelineRepo?: string;
  pipelinePrefix: string;
  pipelinePermissionsMode: PipelinePermissionsMode;
  pipelineBranchProduction: string;
}

function loadFirstExistingEnvFile(candidates: string[]): void {
  for (const candidate of candidates) {
    try {
      process.loadEnvFile(candidate);
      return;
    } catch {
      // Keep trying fallback paths until one exists.
    }
  }
}

function loadInfraEnv(): void {
  const cwd = process.cwd();
  loadFirstExistingEnvFile([
    `${cwd}/.env.local`,
    `${cwd}/.env`,
    `${cwd}/../../.env.local`,
    `${cwd}/../../.env`,
    `${cwd}/../../../.env.local`,
    `${cwd}/../../../.env`,
  ]);
}

// Load environment variables
loadInfraEnv();

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`${name} is required`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    return undefined;
  }
  return value;
}

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = optionalEnv(name);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function numberEnv(name: string, fallback?: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') {
    if (fallback === undefined) {
      throw new Error(`${name} is required`);
    }
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number`);
  }
  return parsed;
}

function booleanEnv(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  return raw === 'true';
}

function inferHostedZoneDomain(domain: string): string {
  const segments = domain.split('.');
  if (segments.length <= 2) {
    return domain;
  }
  return segments.slice(-2).join('.');
}

function resolveAwsRegion(): string {
  const region = process.env.AWS_REGION ?? process.env.LLM_PROXY_REGION;
  if (!region || region.trim() === '') {
    throw new Error('AWS_REGION is required');
  }
  return region;
}

export function loadLLMProxyStackConfig(): LLMProxyStackConfig {
  const stage = $app.stage;
  const domain = requiredEnv('LLM_PROXY_DOMAIN');
  const bootstrapOnly = booleanEnv('INFRA_LLM_PROXY_BOOTSTRAP_ONLY', false);

  return {
    appName: process.env.INFRA_APP_NAME ?? 'llm-proxy',
    stage,
    region: resolveAwsRegion(),
    domain,
    hostedZoneDomain:
      optionalEnv('LLM_PROXY_HOSTED_ZONE_DOMAIN') ??
      optionalEnv('INFRA_HOSTED_ZONE_DOMAIN') ??
      inferHostedZoneDomain(domain),
    imageRepository: process.env.LLM_PROXY_IMAGE_REPOSITORY ?? 'llm-proxy-production',
    imageUri:
      optionalEnv('LLM_PROXY_IMAGE_URI') ??
      `public.ecr.aws/docker/library/node:24-alpine`,
    lambdaMemoryMb: numberEnv('LLM_PROXY_LAMBDA_MEMORY_MB', 256),
    lambdaTimeoutSeconds: numberEnv('LLM_PROXY_LAMBDA_TIMEOUT_SECONDS', 90),
    bootstrapOnly,
    createPipelines: booleanEnv('INFRA_CREATE_PIPELINES', false),
    certificateArn: optionalEnv('LLM_PROXY_CERTIFICATE_ARN'),
    projectTag: process.env.INFRA_PROJECT_TAG ?? 'llm-proxy',
    pipelineRepo: optionalEnv('INFRA_PIPELINE_REPO'),
    pipelinePrefix: process.env.INFRA_PIPELINE_PREFIX ?? 'llm-proxy',
    pipelinePermissionsMode:
      (process.env.INFRA_PIPELINE_PERMISSIONS_MODE ?? 'admin') === 'least-privilege'
        ? 'least-privilege'
        : 'admin',
    pipelineBranchProduction: process.env.INFRA_PIPELINE_BRANCH_PROD ?? 'main',
  };
}

function loadPipelineConfig(): {
  repositoryName: string;
  repositoryBranch: string;
  repositoryOwner: string;
  codestarConnectionArn: string;
} {
  return {
    repositoryName: requiredEnv('INFRA_PIPELINE_REPO_NAME'),
    repositoryBranch: firstEnv('INFRA_PIPELINE_BRANCH_PROD', 'INFRA_PIPELINE_BRANCH') ?? 'main',
    repositoryOwner: requiredEnv('INFRA_PIPELINE_REPO_OWNER'),
    codestarConnectionArn: requiredEnv('INFRA_CODESTAR_CONNECTION_ARN'),
  };
}

export function createInfrastructure() {
  const config = loadLLMProxyStackConfig();
  const namePrefix = `${config.appName}-${config.stage}`;
  const tags = {
    project: config.projectTag,
    service: 'llm-proxy',
    stage: config.stage,
    managedBy: 'sst',
  };

  // Create SQS Queues
  const dlq = new aws.sqs.Queue(`${namePrefix}-dlq`, {
    name: `${namePrefix}-dlq`,
    messageRetentionSeconds: 1209600, // 14 days
    tags,
  });

  // Create request queue with redrive policy
  const requestQueue = new aws.sqs.Queue(`${namePrefix}-request-queue`, {
    name: `${namePrefix}-request-queue`,
    visibilityTimeoutSeconds: 120,
    messageRetentionSeconds: 300,
    receiveWaitTimeSeconds: 20,
    redrivePolicy: pulumi.jsonStringify({
      deadLetterTargetArn: dlq.arn,
      maxReceiveCount: 3,
    }),
    tags,
  });

  const responseQueue = new aws.sqs.Queue(`${namePrefix}-response-queue`, {
    name: `${namePrefix}-response-queue`,
    visibilityTimeoutSeconds: 30,
    messageRetentionSeconds: 300,
    receiveWaitTimeSeconds: 20,
    tags,
  });

  // Create DynamoDB Table
  const stateTable = new aws.dynamodb.Table(`${namePrefix}-state`, {
    name: `${namePrefix}-state`,
    billingMode: 'PAY_PER_REQUEST',
    hashKey: 'PK',
    rangeKey: 'SK',
    attributes: [
      { name: 'PK', type: 'S' },
      { name: 'SK', type: 'S' },
    ],
    ttl: {
      attributeName: 'ttl',
      enabled: true,
    },
    tags,
  });

  // Create SNS Topic for Alerts
  const alertsTopic = new aws.sns.Topic(`${namePrefix}-alerts`, {
    name: `${namePrefix}-alerts`,
    tags,
  });

  // Create CloudWatch Log Group
  const logGroup = new aws.cloudwatch.LogGroup(`${namePrefix}-logs`, {
    name: `/aws/lambda/${namePrefix}`,
    retentionInDays: 30,
    tags,
  });

  // Create IAM Role for Lambda
  const lambdaRole = new aws.iam.Role(`${namePrefix}-lambda-role`, {
    name: `${namePrefix}-lambda-role`,
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: 'lambda.amazonaws.com',
    }),
    tags,
  });

  // Attach basic Lambda execution policy
  new aws.iam.RolePolicyAttachment(`${namePrefix}-lambda-basic-execution`, {
    role: lambdaRole.name,
    policyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
  });

  // Create inline policy for SQS and DynamoDB access
  new aws.iam.RolePolicy(`${namePrefix}-lambda-policy`, {
    role: lambdaRole.id,
    policy: pulumi.jsonStringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: [
            'sqs:SendMessage',
            'sqs:ReceiveMessage',
            'sqs:DeleteMessage',
            'sqs:GetQueueAttributes',
          ],
          Resource: [requestQueue.arn, responseQueue.arn, dlq.arn],
        },
        {
          Effect: 'Allow',
          Action: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:Query',
            'dynamodb:Scan',
          ],
          Resource: stateTable.arn,
        },
        {
          Effect: 'Allow',
          Action: ['sns:Publish'],
          Resource: alertsTopic.arn,
        },
      ],
    }),
  });

  // Create IAM User for Colab Worker
  const workerUser = new aws.iam.User(`${namePrefix}-worker-user`, {
    name: `${namePrefix}-worker-user`,
    tags,
  });

  // Create inline policy for worker user
  new aws.iam.UserPolicy(`${namePrefix}-worker-policy`, {
    user: workerUser.name,
    policy: pulumi.jsonStringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'],
          Resource: requestQueue.arn,
        },
        {
          Effect: 'Allow',
          Action: ['sqs:SendMessage'],
          Resource: responseQueue.arn,
        },
        {
          Effect: 'Allow',
          Action: [
            'dynamodb:GetItem',
            'dynamodb:PutItem',
            'dynamodb:UpdateItem',
            'dynamodb:Query',
          ],
          Resource: stateTable.arn,
        },
      ],
    }),
  });

  // Create ECR Repository
  const repository = new aws.ecr.Repository(`${namePrefix}-repository`, {
    name: config.imageRepository,
    imageScanningConfiguration: {
      scanOnPush: true,
    },
    imageTagMutability: 'MUTABLE',
    tags,
  });

  // Set ECR lifecycle policy
  new aws.ecr.LifecyclePolicy(`${namePrefix}-repository-lifecycle`, {
    repository: repository.name,
    policy: JSON.stringify({
      rules: [
        {
          rulePriority: 1,
          description: 'Keep the most recent 10 images',
          selection: {
            tagStatus: 'any',
            countType: 'imageCountMoreThan',
            countNumber: 10,
          },
          action: { type: 'expire' },
        },
      ],
    }),
  });

  // Create CloudWatch Alarms
  new aws.cloudwatch.MetricAlarm(`${namePrefix}-queue-depth-alarm`, {
    name: `${namePrefix}-queue-depth`,
    comparisonOperator: 'GreaterThanThreshold',
    evaluationPeriods: 1,
    metricName: 'ApproximateNumberOfMessagesVisible',
    namespace: 'AWS/SQS',
    period: 300,
    statistic: 'Average',
    threshold: 10,
    alarmActions: [alertsTopic.arn],
    dimensions: {
      QueueName: requestQueue.name,
    },
    tags,
  });

  new aws.cloudwatch.MetricAlarm(`${namePrefix}-dlq-alarm`, {
    name: `${namePrefix}-dlq-messages`,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    evaluationPeriods: 1,
    metricName: 'ApproximateNumberOfMessagesVisible',
    namespace: 'AWS/SQS',
    period: 300,
    statistic: 'Average',
    threshold: 1,
    alarmActions: [alertsTopic.arn],
    dimensions: {
      QueueName: dlq.name,
    },
    tags,
  });

  new aws.cloudwatch.MetricAlarm(`${namePrefix}-lambda-errors-alarm`, {
    name: `${namePrefix}-lambda-errors`,
    comparisonOperator: 'GreaterThanOrEqualToThreshold',
    evaluationPeriods: 1,
    metricName: 'Errors',
    namespace: 'AWS/Lambda',
    period: 300,
    statistic: 'Sum',
    threshold: 5,
    alarmActions: [alertsTopic.arn],
    dimensions: {
      FunctionName: `${namePrefix}`,
    },
    tags,
  });

  const outputs: Record<string, unknown> = {
    requestQueueUrl: requestQueue.url,
    responseQueueUrl: responseQueue.url,
    dlqUrl: dlq.url,
    stateTableName: stateTable.name,
    lambdaRoleArn: lambdaRole.arn,
    workerUserName: workerUser.name,
    repositoryName: repository.name,
    repositoryUrl: repository.repositoryUrl,
    alertsTopicArn: alertsTopic.arn,
    logGroupName: logGroup.name,
    bootstrapOnly: config.bootstrapOnly,
  };

  // Bootstrap-only deployments are a one-time initialization path
  if (config.bootstrapOnly) {
    return outputs;
  }

  // ---------------------------------------------------------------------------
  // Route 53 Hosted Zone lookup
  // ---------------------------------------------------------------------------
  const zone = aws.route53.getZoneOutput({
    name: `${config.hostedZoneDomain}.`,
    privateZone: false,
  });

  // ---------------------------------------------------------------------------
  // ACM Certificate — create if no ARN was provided, with full DNS validation
  // ---------------------------------------------------------------------------
  const certificate =
    config.certificateArn !== undefined
      ? undefined
      : new aws.acm.Certificate(`${namePrefix}-certificate`, {
          domainName: config.domain,
          validationMethod: 'DNS',
          tags,
        });

  // Create the DNS validation CNAME so ACM can auto-validate the certificate
  const validationRecord =
    certificate === undefined
      ? undefined
      : new aws.route53.Record(`${namePrefix}-certificate-validation`, {
          zoneId: zone.zoneId,
          name: certificate.domainValidationOptions.apply(
            (options) => options[0]?.resourceRecordName ?? config.domain
          ),
          type: certificate.domainValidationOptions.apply(
            (options) => options[0]?.resourceRecordType ?? 'CNAME'
          ),
          records: certificate.domainValidationOptions.apply((options) => [
            options[0]?.resourceRecordValue ?? '',
          ]),
          ttl: 60,
          allowOverwrite: true,
        });

  // Wait for the certificate to be validated before using it
  const certificateArn =
    config.certificateArn ??
    new aws.acm.CertificateValidation(`${namePrefix}-certificate-validation-complete`, {
      certificateArn: certificate!.arn,
      validationRecordFqdns: [validationRecord!.fqdn],
    }).certificateArn;

  // ---------------------------------------------------------------------------
  // Lambda Function
  // ---------------------------------------------------------------------------
  const lambdaFunction = new aws.lambda.Function(`${namePrefix}`, {
    name: `${namePrefix}`,
    role: lambdaRole.arn,
    handler: 'index.handler',
    runtime: 'nodejs20.x',
    memorySize: config.lambdaMemoryMb,
    timeout: config.lambdaTimeoutSeconds,
    environment: {
      variables: {
        REQUEST_QUEUE_URL: requestQueue.url,
        RESPONSE_QUEUE_URL: responseQueue.url,
        STATE_TABLE_NAME: stateTable.name,
        ALERTS_TOPIC_ARN: alertsTopic.arn,
      },
    },
    code: new pulumi.asset.AssetArchive({
      '.': new pulumi.asset.FileArchive('./dist'),
    }),
    tags,
  });

  // ---------------------------------------------------------------------------
  // API Gateway HTTP API
  // ---------------------------------------------------------------------------
  const api = new aws.apigatewayv2.Api(`${namePrefix}-api`, {
    name: `${namePrefix}-api`,
    protocolType: 'HTTP',
    tags,
  });

  // Create Lambda integration
  const integration = new aws.apigatewayv2.Integration(`${namePrefix}-integration`, {
    apiId: api.id,
    integrationType: 'AWS_PROXY',
    integrationMethod: 'POST',
    integrationUri: lambdaFunction.invokeArn,
    payloadFormatVersion: '2.0',
  });

  // Create routes
  const routes = [
    'GET /health',
    'GET /v1/models',
    'POST /v1/chat/completions',
    'POST /v1/completions',
    'GET /admin/sessions',
    'GET /mcp/tools',
  ];

  for (const routeKey of routes) {
    new aws.apigatewayv2.Route(`${namePrefix}-route-${routeKey.replace(/\s+/g, '-')}`, {
      apiId: api.id,
      routeKey,
      target: pulumi.interpolate`integrations/${integration.id}`,
    });
  }

  // Create stage
  const apiStage = new aws.apigatewayv2.Stage(`${namePrefix}-stage`, {
    apiId: api.id,
    name: config.stage,
    autoDeploy: true,
    accessLogSettings: {
      destinationArn: logGroup.arn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        ip: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        httpMethod: '$context.httpMethod',
        resourcePath: '$context.resourcePath',
        status: '$context.status',
        protocol: '$context.protocol',
        responseLength: '$context.responseLength',
        integrationLatency: '$context.integration.latency',
      }),
    },
  });

  // Grant API Gateway permission to invoke Lambda
  new aws.lambda.Permission(`${namePrefix}-api-gateway-invoke`, {
    action: 'lambda:InvokeFunction',
    function: lambdaFunction.name,
    principal: 'apigateway.amazonaws.com',
    sourceArn: pulumi.interpolate`${api.executionArn}/*/*`,
  });

  // ---------------------------------------------------------------------------
  // Custom Domain — maps llm-proxy.cig.technology → API Gateway HTTP API
  // ---------------------------------------------------------------------------
  const customDomain = new aws.apigatewayv2.DomainName(`${namePrefix}-custom-domain`, {
    domainName: config.domain,
    domainNameConfiguration: {
      certificateArn: certificateArn,
      endpointType: 'REGIONAL',
      securityPolicy: 'TLS_1_2',
    },
    tags,
  });

  // Map the custom domain to the API stage
  new aws.apigatewayv2.ApiMapping(`${namePrefix}-api-mapping`, {
    apiId: api.id,
    domainName: customDomain.domainName,
    stage: apiStage.id,
  });

  // Create Route 53 alias record pointing to the API Gateway custom domain
  new aws.route53.Record(`${namePrefix}-dns`, {
    zoneId: zone.zoneId,
    name: config.domain,
    type: 'A',
    aliases: [
      {
        name: customDomain.domainNameConfiguration.apply((c) => c.targetDomainName),
        zoneId: customDomain.domainNameConfiguration.apply((c) => c.hostedZoneId),
        evaluateTargetHealth: true,
      },
    ],
  });

  outputs.apiEndpoint = api.apiEndpoint;
  outputs.apiUrl = pulumi.interpolate`https://${config.domain}`;
  outputs.customDomainName = customDomain.domainName;
  outputs.lambdaFunctionName = lambdaFunction.name;
  outputs.lambdaFunctionArn = lambdaFunction.arn;

  // Create AWS-native pipeline if enabled
  if (config.createPipelines) {
    const pipelineConfig = loadPipelineConfig();
    
    // Create S3 bucket for pipeline artifacts
    const artifactBucket = new aws.s3.Bucket(`${namePrefix}-pipeline-artifacts`, {
      bucket: `${namePrefix}-pipeline-artifacts-${config.region}`,
      acl: 'private',
      versioning: {
        enabled: true,
      },
      serverSideEncryptionConfiguration: {
        rule: {
          applyServerSideEncryptionByDefault: {
            sseAlgorithm: 'AES256',
          },
        },
      },
      tags,
    });

    // Create IAM role for CodePipeline
    const pipelineRole = new aws.iam.Role(`${namePrefix}-pipeline-role`, {
      name: `${namePrefix}-pipeline-role`,
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: 'codepipeline.amazonaws.com',
      }),
      tags,
    });

    new aws.iam.RolePolicyAttachment(`${namePrefix}-pipeline-s3-policy`, {
      role: pipelineRole.name,
      policyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess',
    });

    new aws.iam.RolePolicyAttachment(`${namePrefix}-pipeline-codebuild-policy`, {
      role: pipelineRole.name,
      policyArn: 'arn:aws:iam::aws:policy/AWSCodeBuildAdminAccess',
    });

    // Create IAM role for CodeBuild
    const buildRole = new aws.iam.Role(`${namePrefix}-build-role`, {
      name: `${namePrefix}-build-role`,
      assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: 'codebuild.amazonaws.com',
      }),
      tags,
    });

    new aws.iam.RolePolicyAttachment(`${namePrefix}-build-logs-policy`, {
      role: buildRole.name,
      policyArn: 'arn:aws:iam::aws:policy/CloudWatchLogsFullAccess',
    });

    new aws.iam.RolePolicyAttachment(`${namePrefix}-build-s3-policy`, {
      role: buildRole.name,
      policyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess',
    });

    new aws.iam.RolePolicyAttachment(`${namePrefix}-build-ecr-policy`, {
      role: buildRole.name,
      policyArn: 'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser',
    });

    new aws.iam.RolePolicy(`${namePrefix}-build-deploy-policy`, {
      role: buildRole.id,
      policy: pulumi.jsonStringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'cloudformation:*',
              'iam:*',
              'sqs:*',
              'dynamodb:*',
              'lambda:*',
              'apigateway:*',
              'sns:*',
              'cloudwatch:*',
              'logs:*',
              'route53:*',
              'acm:*',
            ],
            Resource: '*',
          },
          {
            Effect: 'Allow',
            Action: ['sts:AssumeRole'],
            Resource: '*',
          },
        ],
      }),
    });

    // Create CodeBuild project for validation
    const validateProject = new aws.codebuild.Project(
      `${namePrefix}-validate`,
      {
        name: `${namePrefix}-validate`,
        serviceRole: buildRole.arn,
        artifacts: {
          type: 'CODEPIPELINE',
        },
        concurrentBuildLimit: 1,
        environment: {
          computeType: 'BUILD_GENERAL1_SMALL',
          image: 'aws/codebuild/standard:7.0',
          type: 'LINUX_CONTAINER',
          imagePullCredentialsType: 'CODEBUILD',
        },
        source: {
          type: 'CODEPIPELINE',
          buildspec: `
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 22
    commands:
      - npm install -g pnpm
  pre_build:
    commands:
      - echo "Installing dependencies..."
      - find . -name node_modules -type d -prune -exec rm -rf {} + 2>/dev/null || true
      - pnpm install --filter @llm-proxy/app... --no-frozen-lockfile
  build:
    commands:
      - echo "Linting..."
      - pnpm --filter @llm-proxy/app lint || true
      - echo "Running tests..."
      - pnpm --filter @llm-proxy/app test || true
      - echo "Building..."
      - pnpm --filter @llm-proxy/app build
artifacts:
  files:
    - '**/*'
  name: BuildArtifact
`,
        },
        tags,
      }
    );

    // Create CodeBuild project for Docker build
    const buildProject = new aws.codebuild.Project(
      `${namePrefix}-build-docker`,
      {
        name: `${namePrefix}-build-docker`,
        serviceRole: buildRole.arn,
        artifacts: {
          type: 'CODEPIPELINE',
        },
        concurrentBuildLimit: 1,
        environment: {
          computeType: 'BUILD_GENERAL1_MEDIUM',
          image: 'aws/codebuild/standard:7.0',
          type: 'LINUX_CONTAINER',
          imagePullCredentialsType: 'CODEBUILD',
          privilegedMode: true,
        },
        source: {
          type: 'CODEPIPELINE',
          buildspec: `
version: 0.2
phases:
  pre_build:
    commands:
      - echo "Logging in to Amazon ECR..."
      - ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com
      - REPOSITORY_URI=$ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/${config.imageRepository}
      - COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)
      - IMAGE_TAG=\${COMMIT_HASH:=latest}
  build:
    commands:
      - echo "Building Docker image..."
      - docker build -f packages/llm-proxy/Dockerfile -t $REPOSITORY_URI:$IMAGE_TAG .
      - docker tag $REPOSITORY_URI:$IMAGE_TAG $REPOSITORY_URI:latest
  post_build:
    commands:
      - echo "Pushing Docker image to ECR..."
      - docker push $REPOSITORY_URI:$IMAGE_TAG
      - docker push $REPOSITORY_URI:latest
      - printf '[{"name":"llm-proxy","imageUri":"%s"}]' $REPOSITORY_URI:$IMAGE_TAG > imagedefinitions.json
artifacts:
  files:
    - imagedefinitions.json
env:
  variables:
    AWS_DEFAULT_REGION: ${config.region}
`,
        },
        tags,
      }
    );

    // Create CodeBuild project for deployment
    const deployProject = new aws.codebuild.Project(
      `${namePrefix}-deploy`,
      {
        name: `${namePrefix}-deploy`,
        serviceRole: buildRole.arn,
        artifacts: {
          type: 'CODEPIPELINE',
        },
        concurrentBuildLimit: 1,
        environment: {
          computeType: 'BUILD_GENERAL1_SMALL',
          image: 'aws/codebuild/standard:7.0',
          type: 'LINUX_CONTAINER',
          imagePullCredentialsType: 'CODEBUILD',
        },
        source: {
          type: 'CODEPIPELINE',
          buildspec: `
version: 0.2
phases:
  install:
    runtime-versions:
      nodejs: 22
    commands:
      - npm install -g pnpm
  pre_build:
    commands:
      - echo "Installing dependencies..."
      - find . -name node_modules -type d -prune -exec rm -rf {} + 2>/dev/null || true
      - pnpm install --filter @llm-proxy/app... --no-frozen-lockfile
      - echo "Reading image definitions..."
      - IMAGE_URI=$(cat $CODEBUILD_SRC_DIR_BuildOutput/imagedefinitions.json | jq -r '.[0].imageUri')
      - echo "Image URI $IMAGE_URI"
  build:
    commands:
      - echo "Deploying LLM Proxy via SST..."
      - export LLM_PROXY_IMAGE_URI=$IMAGE_URI
      - export LLM_PROXY_LAMBDA_MEMORY_MB=256
      - export LLM_PROXY_LAMBDA_TIMEOUT_SECONDS=90
      - export LLM_PROXY_DOMAIN=${config.domain}
      - export LLM_PROXY_HOSTED_ZONE_DOMAIN=cig.technology
      - export LLM_PROXY_IMAGE_REPOSITORY=${config.imageRepository}
      - pnpm --filter @llm-proxy/app deploy:production
      - echo "Deployment completed"
env:
  variables:
    AWS_REGION: ${config.region}
`,
        },
        tags,
      }
    );

    // Create CodePipeline
    const pipeline = new aws.codepipeline.Pipeline(
      `${namePrefix}-pipeline`,
      {
        name: `${namePrefix}-pipeline`,
        roleArn: pipelineRole.arn,
        artifactStores: [
          {
            location: artifactBucket.bucket,
            type: 'S3',
          },
        ],
        stages: [
          {
            name: 'Source',
            actions: [
              {
                name: 'SourceAction',
                category: 'Source',
                owner: 'AWS',
                provider: 'CodeStarSourceConnection',
                version: '1',
                configuration: {
                  FullRepositoryId: `${pipelineConfig.repositoryOwner}/${pipelineConfig.repositoryName}`,
                  BranchName: pipelineConfig.repositoryBranch,
                  ConnectionArn: pipelineConfig.codestarConnectionArn,
                },
                outputArtifacts: ['SourceOutput'],
              },
            ],
          },
          {
            name: 'Build',
            actions: [
              {
                name: 'BuildDocker',
                category: 'Build',
                owner: 'AWS',
                provider: 'CodeBuild',
                version: '1',
                configuration: {
                  ProjectName: buildProject.name,
                },
                inputArtifacts: ['SourceOutput'],
                outputArtifacts: ['BuildOutput'],
              },
            ],
          },
          {
            name: 'Deploy',
            actions: [
              {
                name: 'DeploySST',
                category: 'Build',
                owner: 'AWS',
                provider: 'CodeBuild',
                version: '1',
                configuration: {
                  ProjectName: deployProject.name,
                  PrimarySource: 'SourceOutput',
                },
                inputArtifacts: ['SourceOutput', 'BuildOutput'],
              },
            ],
          },
        ],
        tags,
      }
    );

    outputs.pipelineArn = pipeline.arn;
    outputs.pipelineName = pipeline.name;
    outputs.codeBuildValidateProjectName = validateProject.name;
    outputs.codeBuildBuildProjectName = buildProject.name;
    outputs.codeBuildDeployProjectName = deployProject.name;
    outputs.artifactBucketName = artifactBucket.bucket;
  }

  return outputs;
}
