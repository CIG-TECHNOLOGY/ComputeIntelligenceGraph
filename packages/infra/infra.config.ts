/// <reference path="./sst-env.d.ts" />

import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { createPipeline } from '@lsts_tech/infra';
import { loadInfraEnv, resolveAwsRegion } from './src/config/env.js';

type PipelinePermissionsMode = 'admin' | 'least-privilege';

const ECS_TASK_EXECUTION_ROLE_POLICY_ARN =
  'arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy';

loadInfraEnv();

interface ApiStackConfig {
  appName: string;
  stage: string;
  region: string;
  domain: string;
  hostedZoneDomain: string;
  imageRepository: string;
  imageUri: string;
  containerPort: number;
  cpu: number;
  memoryMiB: number;
  desiredCount: number;
  vpcId: string;
  publicSubnetIds: string[];
  privateSubnetIds: string[];
  albSecurityGroupId: string;
  apiSecurityGroupIds: string[];
  databaseUrlSecretArn: string;
  jwtSecretArn: string;
  neo4jBoltUri: string;
  neo4jPasswordSecretArn: string;
  openAiApiKeySecretArn: string;
  authentikIssuerSecretArn: string;
  authentikJwksSecretArn: string;
  authentikTokenEndpointSecretArn: string;
  oidcClientIdSecretArn: string;
  oidcClientSecretSecretArn: string;
  corsOrigins: string[];
  createPipelines: boolean;
  bootstrapOnly: boolean;
  certificateArn?: string;
  healthCheckPath: string;
  supabaseUrlSecretArn?: string;
  supabaseServiceRoleKeySecretArn?: string;
  projectTag: string;
  pipelineRepo?: string;
  pipelinePrefix: string;
  pipelinePermissionsMode: PipelinePermissionsMode;
  pipelineBranchProduction: string;
}

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

function csvEnv(name: string, required = false): string[] {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    if (required) {
      throw new Error(`${name} is required`);
    }
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
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

export function loadApiStackConfig(): ApiStackConfig {
  const stage = $app.stage;
  const domain = requiredEnv('API_DOMAIN');
  const bootstrapOnly = booleanEnv('INFRA_API_BOOTSTRAP_ONLY', false);
  const smtpHost = firstEnv('API_SMTP_HOST', 'SMTP_HOST');
  const smtpPortRaw = firstEnv('API_SMTP_PORT', 'SMTP_PORT');
  const smtpSecureRaw = firstEnv('API_SMTP_SECURE', 'SMTP_SECURE');
  const smtpFromEmail = firstEnv('API_SMTP_FROM_EMAIL', 'SMTP_FROM_EMAIL');
  const smtpAuthEnabledRaw = firstEnv('API_SMTP_AUTH_ENABLED', 'SMTP_AUTH_ENABLED');
  const smtpUser = firstEnv('API_SMTP_USER', 'SMTP_USER');
  const smtpOtpSubject = firstEnv('API_SMTP_OTP_SUBJECT', 'SMTP_OTP_SUBJECT');
  const smtpPasswordSecretArn = firstEnv(
    'API_SMTP_PASSWORD_SECRET_ARN',
    'SMTP_PASSWORD_SECRET_ARN'
  );
  const openAiApiKeySecretArn = firstEnv(
    'API_OPENAI_API_KEY_SECRET_ARN',
    'OPENAI_API_KEY_SECRET_ARN'
  );
  const smtpPort = smtpPortRaw ? Number(smtpPortRaw) : 587;
  if (smtpPortRaw && !Number.isFinite(smtpPort)) {
    throw new Error('API_SMTP_PORT / SMTP_PORT must be a number');
  }
  const smtpSecure = smtpSecureRaw ? smtpSecureRaw === 'true' : smtpPort === 465;
  const smtpAuthEnabled = smtpAuthEnabledRaw ? smtpAuthEnabledRaw === 'true' : true;

  if (!bootstrapOnly) {
    const missing = [
      smtpHost ? undefined : 'API_SMTP_HOST / SMTP_HOST',
      smtpPortRaw ? undefined : 'API_SMTP_PORT / SMTP_PORT',
      smtpFromEmail ? undefined : 'API_SMTP_FROM_EMAIL / SMTP_FROM_EMAIL',
      smtpAuthEnabled && !smtpPasswordSecretArn
        ? 'API_SMTP_PASSWORD_SECRET_ARN / SMTP_PASSWORD_SECRET_ARN'
        : undefined,
      !openAiApiKeySecretArn ? 'API_OPENAI_API_KEY_SECRET_ARN / OPENAI_API_KEY_SECRET_ARN' : undefined,
    ].filter((value): value is string => Boolean(value));

    if (missing.length > 0) {
      throw new Error(`Missing runtime config: ${missing.join(', ')}`);
    }
  }

  return {
    appName: process.env.INFRA_APP_NAME ?? 'cig-api',
    stage,
    region: resolveAwsRegion(),
    domain,
    hostedZoneDomain:
      optionalEnv('API_HOSTED_ZONE_DOMAIN') ??
      optionalEnv('INFRA_HOSTED_ZONE_DOMAIN') ??
      inferHostedZoneDomain(domain),
    imageRepository: requiredEnv('API_IMAGE_REPOSITORY'),
    imageUri:
      optionalEnv('API_IMAGE_URI') ??
      `public.ecr.aws/docker/library/node:22-alpine`,
    containerPort: numberEnv('API_CONTAINER_PORT', 8080),
    cpu: numberEnv('API_CPU', 512),
    memoryMiB: numberEnv('API_MEMORY_MIB', 1024),
    desiredCount: numberEnv('API_DESIRED_COUNT', 1),
    vpcId: bootstrapOnly ? 'bootstrap-vpc' : requiredEnv('API_VPC_ID'),
    publicSubnetIds: bootstrapOnly ? [] : csvEnv('API_PUBLIC_SUBNET_IDS', true),
    privateSubnetIds: bootstrapOnly ? [] : csvEnv('API_PRIVATE_SUBNET_IDS', true),
    albSecurityGroupId: bootstrapOnly ? 'bootstrap-alb-sg' : requiredEnv('API_ALB_SECURITY_GROUP_ID'),
    apiSecurityGroupIds: bootstrapOnly ? [] : csvEnv('API_SECURITY_GROUP_IDS', true),
    databaseUrlSecretArn: bootstrapOnly ? 'bootstrap-database-secret' : requiredEnv('API_DATABASE_URL_SECRET_ARN'),
    jwtSecretArn: bootstrapOnly ? 'bootstrap-jwt-secret' : requiredEnv('API_JWT_SECRET_ARN'),
    neo4jBoltUri: bootstrapOnly ? 'bolt://bootstrap:7687' : requiredEnv('API_NEO4J_BOLT_URI'),
    neo4jPasswordSecretArn: bootstrapOnly ? 'bootstrap-neo4j-secret' : requiredEnv('API_NEO4J_PASSWORD_SECRET_ARN'),
    openAiApiKeySecretArn:
      bootstrapOnly ? 'bootstrap-openai-api-key' : requiredEnv('API_OPENAI_API_KEY_SECRET_ARN'),
    authentikIssuerSecretArn:
      bootstrapOnly ? 'bootstrap-authentik-issuer' : requiredEnv('API_AUTHENTIK_ISSUER_URL_SECRET_ARN'),
    authentikJwksSecretArn:
      bootstrapOnly ? 'bootstrap-authentik-jwks' : requiredEnv('API_AUTHENTIK_JWKS_URI_SECRET_ARN'),
    authentikTokenEndpointSecretArn:
      bootstrapOnly ? 'bootstrap-authentik-token' : requiredEnv('API_AUTHENTIK_TOKEN_ENDPOINT_SECRET_ARN'),
    oidcClientIdSecretArn:
      bootstrapOnly ? 'bootstrap-oidc-client-id' : requiredEnv('API_OIDC_CLIENT_ID_SECRET_ARN'),
    oidcClientSecretSecretArn:
      bootstrapOnly ? 'bootstrap-oidc-client-secret' : requiredEnv('API_OIDC_CLIENT_SECRET_SECRET_ARN'),
    corsOrigins: csvEnv('API_CORS_ORIGINS', !bootstrapOnly),
    createPipelines: booleanEnv('INFRA_CREATE_PIPELINES', false),
    bootstrapOnly,
    certificateArn: optionalEnv('API_CERTIFICATE_ARN'),
    healthCheckPath: process.env.API_HEALTH_CHECK_PATH ?? '/api/v1/health',
    supabaseUrlSecretArn: optionalEnv('API_SUPABASE_URL_SECRET_ARN'),
    supabaseServiceRoleKeySecretArn: optionalEnv(
      'API_SUPABASE_SERVICE_ROLE_KEY_SECRET_ARN'
    ),
    smtpHost: smtpHost ?? '',
    smtpPort,
    smtpSecure,
    smtpFromEmail: smtpFromEmail ?? '',
    smtpAuthEnabled,
    smtpUser,
    smtpOtpSubject,
    smtpPasswordSecretArn,
    projectTag: process.env.INFRA_PROJECT_TAG ?? 'cig-api',
    pipelineRepo: optionalEnv('INFRA_PIPELINE_REPO'),
    pipelinePrefix: process.env.INFRA_PIPELINE_PREFIX ?? 'cig-api',
    pipelinePermissionsMode:
      (process.env.INFRA_PIPELINE_PERMISSIONS_MODE ?? 'admin') === 'least-privilege'
        ? 'least-privilege'
        : 'admin',
    pipelineBranchProduction: process.env.INFRA_PIPELINE_BRANCH_PROD ?? 'main',
  };
}

export function secretArns(config: ApiStackConfig): string[] {
  return [
    config.databaseUrlSecretArn,
    config.jwtSecretArn,
    config.neo4jPasswordSecretArn,
    config.openAiApiKeySecretArn,
    config.authentikIssuerSecretArn,
    config.authentikJwksSecretArn,
    config.authentikTokenEndpointSecretArn,
    config.oidcClientIdSecretArn,
    config.oidcClientSecretSecretArn,
    config.supabaseUrlSecretArn,
    config.supabaseServiceRoleKeySecretArn,
    config.smtpPasswordSecretArn,
  ].filter((value): value is string => Boolean(value));
}

export function createInfrastructure() {
  const config = loadApiStackConfig();
  const namePrefix = `${config.appName}-${config.stage}`;
  const tags = {
    project: config.projectTag,
    service: 'api',
    stage: config.stage,
    managedBy: 'sst',
  };

  const repository = aws.ecr.getRepositoryOutput({
    name: config.imageRepository,
  });

  const repositoryLifecyclePolicy = new aws.ecr.LifecyclePolicy(
    `${namePrefix}-repository-lifecycle`,
    {
      repository: repository.name,
      policy: JSON.stringify({
        rules: [
          {
            rulePriority: 1,
            description: 'Keep the most recent 20 tagged images',
            selection: {
              tagStatus: 'tagged',
              tagPatternList: ['*'],
              countType: 'imageCountMoreThan',
              countNumber: 20,
            },
            action: { type: 'expire' },
          },
        ],
      }),
    }
  );

  const outputs: Record<string, unknown> = {
    repositoryName: repository.name,
    repositoryUrl: repository.repositoryUrl,
    bootstrapOnly: config.bootstrapOnly,
  };

  // Bootstrap-only deployments are a one-time initialization path for a fresh stage.
  // Re-running them on an existing runtime stack would delete runtime resources.
  if (config.bootstrapOnly) {
    if (config.stage === 'production' && config.createPipelines && config.pipelineRepo) {
      const pipeline = createPipeline({
        name: `${config.pipelinePrefix}-prod`,
        repo: config.pipelineRepo,
        branch: config.pipelineBranchProduction,
        stage: 'production',
        projectTag: config.projectTag,
        permissionsMode: config.pipelinePermissionsMode,
        buildEnv: {
          INFRA_APP_NAME: config.appName,
          INFRA_PIPELINE_REPO: config.pipelineRepo,
          INFRA_PIPELINE_PREFIX: config.pipelinePrefix,
          INFRA_PROJECT_TAG: config.projectTag,
          INFRA_PIPELINE_BRANCH_PROD: config.pipelineBranchProduction,
          INFRA_CREATE_PIPELINES: 'false',
          API_DOMAIN: config.domain,
          API_IMAGE_REPOSITORY: config.imageRepository,
        },
      });
      outputs.productionPipelineName = pipeline.pipelineName;
    }

    return outputs;
  }

  const zone = aws.route53.getZoneOutput({
    name: `${config.hostedZoneDomain}.`,
    privateZone: false,
  });

  const certificate =
    config.certificateArn !== undefined
      ? undefined
      : new aws.acm.Certificate(`${namePrefix}-certificate`, {
          domainName: config.domain,
          validationMethod: 'DNS',
          tags,
        });

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

  const certificateArn =
    config.certificateArn ??
    new aws.acm.CertificateValidation(`${namePrefix}-certificate-validation-complete`, {
      certificateArn: certificate!.arn,
      validationRecordFqdns: [validationRecord!.fqdn],
    }).certificateArn;

  const cluster = new aws.ecs.Cluster(`${namePrefix}-cluster`, {
    name: `${namePrefix}-cluster`,
    tags,
  });

  const logGroup = new aws.cloudwatch.LogGroup(`${namePrefix}-logs`, {
    name: `/aws/ecs/${namePrefix}`,
    retentionInDays: 30,
    tags,
  });

  const executionRole = new aws.iam.Role(`${namePrefix}-execution-role`, {
    name: `${namePrefix}-ecs-execution`,
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: 'ecs-tasks.amazonaws.com',
    }),
    tags,
  });

  new aws.iam.RolePolicyAttachment(`${namePrefix}-execution-managed-policy`, {
    role: executionRole.name,
    policyArn: ECS_TASK_EXECUTION_ROLE_POLICY_ARN,
  });

  new aws.iam.RolePolicy(`${namePrefix}-execution-secrets-policy`, {
    role: executionRole.id,
    policy: pulumi.jsonStringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
          Resource: secretArns(config),
        },
      ],
    }),
  });

  const taskRole = new aws.iam.Role(`${namePrefix}-task-role`, {
    name: `${namePrefix}-ecs-task`,
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      Service: 'ecs-tasks.amazonaws.com',
    }),
    tags,
  });

  new aws.iam.RolePolicy(`${namePrefix}-task-policy`, {
    role: taskRole.id,
    policy: pulumi.jsonStringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['ce:GetCostAndUsage'],
          Resource: '*',
        },
      ],
    }),
  });

  const taskDefinition = new aws.ecs.TaskDefinition(`${namePrefix}-task`, {
    family: `${namePrefix}-api`,
    cpu: String(config.cpu),
    memory: String(config.memoryMiB),
    networkMode: 'awsvpc',
    requiresCompatibilities: ['FARGATE'],
    executionRoleArn: executionRole.arn,
    taskRoleArn: taskRole.arn,
    runtimePlatform: {
      cpuArchitecture: 'X86_64',
      operatingSystemFamily: 'LINUX',
    },
    containerDefinitions: pulumi
      .all([repository.repositoryUrl, logGroup.name])
      .apply(([repositoryUrl, logGroupName]) =>
        JSON.stringify([
          {
            name: 'api',
            image:
              config.imageUri && !config.imageUri.startsWith('public.ecr.aws/')
                ? config.imageUri
                : `${repositoryUrl}:${process.env.API_IMAGE_TAG ?? 'latest'}`,
            essential: true,
            portMappings: [
              {
                containerPort: config.containerPort,
                hostPort: config.containerPort,
                protocol: 'tcp',
              },
            ],
            environment: [
              { name: 'NODE_ENV', value: 'production' },
              { name: 'HOST', value: '0.0.0.0' },
              { name: 'PORT', value: String(config.containerPort) },
              { name: 'LOG_LEVEL', value: 'info' },
              { name: 'CORS_ORIGINS', value: config.corsOrigins.join(',') },
              { name: 'NEO4J_URI', value: config.neo4jBoltUri },
              { name: 'NEO4J_USER', value: 'neo4j' },
              { name: 'NEO4J_DATABASE', value: 'neo4j' },
              { name: 'OPENAI_CHAT_MODEL', value: process.env.OPENAI_CHAT_MODEL ?? 'gpt-4o-mini' },
              { name: 'OPENAI_TRANSCRIPTION_MODEL', value: process.env.OPENAI_TRANSCRIPTION_MODEL ?? 'whisper-1' },
              { name: 'CHAT_UPLOAD_MAX_BYTES', value: process.env.CHAT_UPLOAD_MAX_BYTES ?? '10485760' },
              { name: 'CHAT_AUDIO_MAX_SECONDS', value: process.env.CHAT_AUDIO_MAX_SECONDS ?? '120' },
              { name: 'SMTP_HOST', value: config.smtpHost },
              { name: 'SMTP_PORT', value: String(config.smtpPort) },
              { name: 'SMTP_SECURE', value: String(config.smtpSecure) },
              { name: 'SMTP_FROM_EMAIL', value: config.smtpFromEmail },
              { name: 'SMTP_AUTH_ENABLED', value: String(config.smtpAuthEnabled) },
              ...(config.smtpUser ? [{ name: 'SMTP_USER', value: config.smtpUser }] : []),
              ...(config.smtpOtpSubject ? [{ name: 'SMTP_OTP_SUBJECT', value: config.smtpOtpSubject }] : []),
            ],
            secrets: [
              { name: 'DATABASE_URL', valueFrom: config.databaseUrlSecretArn },
              { name: 'JWT_SECRET', valueFrom: config.jwtSecretArn },
              { name: 'NEO4J_PASSWORD', valueFrom: config.neo4jPasswordSecretArn },
              {
                name: 'AUTHENTIK_ISSUER_URL',
                valueFrom: config.authentikIssuerSecretArn,
              },
              {
                name: 'AUTHENTIK_JWKS_URI',
                valueFrom: config.authentikJwksSecretArn,
              },
              {
                name: 'AUTHENTIK_TOKEN_ENDPOINT',
                valueFrom: config.authentikTokenEndpointSecretArn,
              },
              {
                name: 'OIDC_CLIENT_ID',
                valueFrom: config.oidcClientIdSecretArn,
              },
              {
                name: 'OIDC_CLIENT_SECRET',
                valueFrom: config.oidcClientSecretSecretArn,
              },
              {
                name: 'OPENAI_API_KEY',
                valueFrom: config.openAiApiKeySecretArn,
              },
              ...(config.supabaseUrlSecretArn
                ? [{ name: 'SUPABASE_URL', valueFrom: config.supabaseUrlSecretArn }]
                : []),
              ...(config.supabaseServiceRoleKeySecretArn
                ? [
                    {
                      name: 'SUPABASE_SERVICE_ROLE_KEY',
                      valueFrom: config.supabaseServiceRoleKeySecretArn,
                    },
                  ]
                : []),
              ...(config.smtpPasswordSecretArn
                ? [{ name: 'SMTP_PASSWORD', valueFrom: config.smtpPasswordSecretArn }]
                : []),
            ],
            logConfiguration: {
              logDriver: 'awslogs',
              options: {
                'awslogs-group': logGroupName,
                'awslogs-region': config.region,
                'awslogs-stream-prefix': 'api',
              },
            },
          },
        ])
      ),
    tags,
  });

  const loadBalancer = new aws.lb.LoadBalancer(`${namePrefix}-alb`, {
    name: `${namePrefix}-alb`,
    internal: false,
    loadBalancerType: 'application',
    securityGroups: [config.albSecurityGroupId],
    subnets: config.publicSubnetIds,
    enableDeletionProtection: config.stage === 'production',
    tags,
  });

  const targetGroup = new aws.lb.TargetGroup(`${namePrefix}-target-group`, {
    name: `${namePrefix}-tg`,
    port: config.containerPort,
    protocol: 'HTTP',
    targetType: 'ip',
    vpcId: config.vpcId,
    deregistrationDelay: 15,
    healthCheck: {
      enabled: true,
      path: config.healthCheckPath,
      matcher: '200-399',
      healthyThreshold: 2,
      unhealthyThreshold: 3,
      interval: 30,
      timeout: 5,
    },
    tags,
  });

  const httpListener = new aws.lb.Listener(`${namePrefix}-http-listener`, {
    loadBalancerArn: loadBalancer.arn,
    port: 80,
    protocol: 'HTTP',
    defaultActions: [
      {
        type: 'redirect',
        redirect: {
          port: '443',
          protocol: 'HTTPS',
          statusCode: 'HTTP_301',
        },
      },
    ],
  });

  const httpsListener = new aws.lb.Listener(`${namePrefix}-https-listener`, {
    loadBalancerArn: loadBalancer.arn,
    port: 443,
    protocol: 'HTTPS',
    sslPolicy: 'ELBSecurityPolicy-TLS13-1-2-2021-06',
    certificateArn,
    defaultActions: [
      {
        type: 'forward',
        targetGroupArn: targetGroup.arn,
      },
    ],
  });

  const service = new aws.ecs.Service(
    `${namePrefix}-service`,
    {
      name: `${namePrefix}-service`,
      cluster: cluster.arn,
      taskDefinition: taskDefinition.arn,
      desiredCount: config.desiredCount,
      launchType: 'FARGATE',
      deploymentCircuitBreaker: {
        enable: true,
        rollback: true,
      },
      healthCheckGracePeriodSeconds: 60,
      networkConfiguration: {
        assignPublicIp: false,
        subnets: config.privateSubnetIds,
        securityGroups: config.apiSecurityGroupIds,
      },
      loadBalancers: [
        {
          targetGroupArn: targetGroup.arn,
          containerName: 'api',
          containerPort: config.containerPort,
        },
      ],
      waitForSteadyState: true,
      tags,
    },
    { dependsOn: [httpsListener, repositoryLifecyclePolicy] }
  );

  const dnsRecord = new aws.route53.Record(`${namePrefix}-dns`, {
    zoneId: zone.zoneId,
    name: config.domain,
    type: 'A',
    aliases: [
      {
        name: loadBalancer.dnsName,
        zoneId: loadBalancer.zoneId,
        evaluateTargetHealth: true,
      },
    ],
  });

  outputs.apiUrl = pulumi.interpolate`https://${config.domain}`;
  outputs.graphqlUrl = pulumi.interpolate`https://${config.domain}/graphql`;
  outputs.websocketUrl = pulumi.interpolate`wss://${config.domain}/ws`;
  outputs.clusterName = cluster.name;
  outputs.serviceName = service.name;
  outputs.loadBalancerDnsName = loadBalancer.dnsName;
  outputs.targetGroupArn = targetGroup.arn;
  outputs.dnsRecordName = dnsRecord.fqdn;

  if (config.stage === 'production' && config.createPipelines && config.pipelineRepo) {
    const pipeline = createPipeline({
      name: `${config.pipelinePrefix}-prod`,
      repo: config.pipelineRepo,
      branch: config.pipelineBranchProduction,
      stage: 'production',
      projectTag: config.projectTag,
      permissionsMode: config.pipelinePermissionsMode,
      buildEnv: {
        INFRA_APP_NAME: config.appName,
        INFRA_PIPELINE_REPO: config.pipelineRepo,
        INFRA_PIPELINE_PREFIX: config.pipelinePrefix,
        INFRA_PROJECT_TAG: config.projectTag,
        INFRA_PIPELINE_BRANCH_PROD: config.pipelineBranchProduction,
        INFRA_CREATE_PIPELINES: 'false',
        INFRA_API_BOOTSTRAP_ONLY: 'false',
        API_DOMAIN: config.domain,
        API_IMAGE_REPOSITORY: config.imageRepository,
      },
    });
    outputs.productionPipelineName = pipeline.pipelineName;
  }

  return outputs;
}
