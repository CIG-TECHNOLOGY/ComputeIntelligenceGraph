/**
 * API runtime deployment for AWS/SST.
 * @packageDocumentation
 */

import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { InfraWrapper } from '../InfraWrapper.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { Logger } from '../logging/Logger.js';
import { DeploymentError } from '../errors.js';
import { ApiDeploymentConfig, ApiDeploymentResult, ApiRuntimeConfig } from '../types.js';
import { resolveApiRuntimeConfig } from './apiRuntime.js';

const execFileAsync = promisify(execFile);

export interface ApiDeployerCommandResult {
  stdout: string;
  stderr: string;
}

export interface ApiDeployerCommandRunner {
  (
    command: string,
    args: string[],
    options: { cwd: string; env: NodeJS.ProcessEnv }
  ): Promise<ApiDeployerCommandResult>;
}

export function buildApiSstEnvironment(
  config: ApiDeploymentConfig,
  runtimeConfig?: ApiRuntimeConfig
): NodeJS.ProcessEnv {
  const bootstrapOnly = config.bootstrapOnly ?? false;
  const resolved = runtimeConfig;
  const imageUri =
    config.imageUri ??
    resolved?.imageUri ??
    (config.imageTag ? `${config.imageRepository}:${config.imageTag}` : 'public.ecr.aws/docker/library/node:22-alpine');

  return {
    ...process.env,
    AWS_REGION: config.region,
    INFRA_APP_NAME: config.appName ?? 'cig-api',
    INFRA_CREATE_PIPELINES: String(config.createPipeline ?? false),
    INFRA_API_BOOTSTRAP_ONLY: String(bootstrapOnly),
    INFRA_PIPELINE_REPO: config.pipelineRepo ?? process.env.INFRA_PIPELINE_REPO ?? '',
    INFRA_PIPELINE_PREFIX:
      config.pipelinePrefix ?? process.env.INFRA_PIPELINE_PREFIX ?? 'cig-api',
    INFRA_PROJECT_TAG: config.projectTag ?? process.env.INFRA_PROJECT_TAG ?? 'cig-api',
    INFRA_PIPELINE_PERMISSIONS_MODE:
      config.pipelinePermissionsMode ??
      process.env.INFRA_PIPELINE_PERMISSIONS_MODE ??
      'admin',
    INFRA_PIPELINE_BRANCH_PROD:
      config.pipelineBranchProduction ??
      process.env.INFRA_PIPELINE_BRANCH_PROD ??
      'main',
    API_DOMAIN: config.domain,
    API_IMAGE_REPOSITORY: config.imageRepository,
    API_IMAGE_URI: imageUri,
    API_CONTAINER_PORT: String(
      resolved?.containerPort ?? config.containerPort ?? 8080
    ),
    API_CPU: String(resolved?.cpu ?? config.cpu ?? 512),
    API_MEMORY_MIB: String(resolved?.memoryMiB ?? config.memoryMiB ?? 1024),
    API_DESIRED_COUNT: String(resolved?.desiredCount ?? config.desiredCount ?? 1),
    API_HOSTED_ZONE_DOMAIN:
      resolved?.hostedZoneDomain ?? config.hostedZoneDomain ?? '',
    API_CERTIFICATE_ARN:
      resolved?.certificateArn ?? config.certificateArn ?? '',
    API_HEALTH_CHECK_PATH:
      resolved?.healthCheckPath ?? config.healthCheckPath ?? '/api/v1/health',
    API_VPC_ID: resolved?.vpcId ?? config.vpcId ?? '',
    API_ALB_SECURITY_GROUP_ID:
      resolved?.albSecurityGroupId ?? config.albSecurityGroupId ?? '',
    API_PUBLIC_SUBNET_IDS: (resolved?.publicSubnetIds ?? config.publicSubnetIds ?? []).join(','),
    API_PRIVATE_SUBNET_IDS: (resolved?.privateSubnetIds ?? config.privateSubnetIds ?? []).join(','),
    API_ASSIGN_PUBLIC_IP: String(resolved?.assignPublicIp ?? config.assignPublicIp ?? false),
    API_SECURITY_GROUP_IDS: (resolved?.securityGroupIds ?? config.securityGroupIds ?? []).join(','),
    API_DATABASE_URL_SECRET_ARN:
      resolved?.databaseUrlSecretArn ?? config.databaseUrlSecretArn ?? '',
    API_JWT_SECRET_ARN: resolved?.jwtSecretArn ?? config.jwtSecretArn ?? '',
    API_NEO4J_BOLT_URI: resolved?.neo4jBoltUri ?? config.neo4jBoltUri ?? '',
    API_NEO4J_PASSWORD_SECRET_ARN:
      resolved?.neo4jPasswordSecretArn ?? config.neo4jPasswordSecretArn ?? '',
    API_OPENAI_API_KEY_SECRET_ARN:
      resolved?.openAiApiKeySecretArn ?? config.openAiApiKeySecretArn ?? '',
    API_AUTHENTIK_ISSUER_URL_SECRET_ARN:
      resolved?.authentikSecretRefs.issuerUrlSecretArn ??
      config.authentikSecretRefs?.issuerUrlSecretArn ??
      '',
    API_AUTHENTIK_JWKS_URI_SECRET_ARN:
      resolved?.authentikSecretRefs.jwksUriSecretArn ??
      config.authentikSecretRefs?.jwksUriSecretArn ??
      '',
    API_AUTHENTIK_TOKEN_ENDPOINT_SECRET_ARN:
      resolved?.authentikSecretRefs.tokenEndpointSecretArn ??
      config.authentikSecretRefs?.tokenEndpointSecretArn ??
      '',
    API_OIDC_CLIENT_ID_SECRET_ARN:
      resolved?.authentikSecretRefs.oidcClientIdSecretArn ??
      config.authentikSecretRefs?.oidcClientIdSecretArn ??
      '',
    API_OIDC_CLIENT_SECRET_SECRET_ARN:
      resolved?.authentikSecretRefs.oidcClientSecretSecretArn ??
      config.authentikSecretRefs?.oidcClientSecretSecretArn ??
      '',
    API_CORS_ORIGINS: (resolved?.corsOrigins ?? config.corsOrigins ?? []).join(','),
    API_SUPABASE_URL_SECRET_ARN:
      resolved?.supabaseUrlSecretArn ?? config.supabaseUrlSecretArn ?? '',
    API_SUPABASE_SERVICE_ROLE_KEY_SECRET_ARN:
      resolved?.supabaseServiceRoleKeySecretArn ??
      config.supabaseServiceRoleKeySecretArn ??
      '',
    API_SMTP_HOST: resolved?.smtpHost ?? config.smtpHost ?? '',
    API_SMTP_PORT: String(resolved?.smtpPort ?? config.smtpPort ?? ''),
    API_SMTP_SECURE: String(resolved?.smtpSecure ?? config.smtpSecure ?? ''),
    API_SMTP_FROM_EMAIL: resolved?.smtpFromEmail ?? config.smtpFromEmail ?? '',
    API_SMTP_AUTH_ENABLED: String(
      resolved?.smtpAuthEnabled ?? config.smtpAuthEnabled ?? ''
    ),
    API_SMTP_USER: resolved?.smtpUser ?? config.smtpUser ?? '',
    API_SMTP_OTP_SUBJECT: resolved?.smtpOtpSubject ?? config.smtpOtpSubject ?? '',
    API_SMTP_PASSWORD_SECRET_ARN:
      resolved?.smtpPasswordSecretArn ?? config.smtpPasswordSecretArn ?? '',
    ANALYTICS_PROVISIONING_MODE:
      resolved?.analyticsProvisioningMode ?? config.analyticsProvisioningMode ?? 'local',
    UMAMI_API_URL: resolved?.umamiApiUrl ?? config.umamiApiUrl ?? '',
    API_UMAMI_API_TOKEN_SECRET_ARN:
      resolved?.umamiApiTokenSecretArn ?? config.umamiApiTokenSecretArn ?? '',
    ANALYTICS_COLLECTOR_URL:
      resolved?.analyticsCollectorUrl ?? config.analyticsCollectorUrl ?? '',
    UMAMI_TEAM_ID: resolved?.umamiTeamId ?? config.umamiTeamId ?? '',
  };
}

function defaultCommandRunner(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv }
): Promise<ApiDeployerCommandResult> {
  return execFileAsync(command, args, {
    cwd: options.cwd,
    env: options.env,
    maxBuffer: 10 * 1024 * 1024,
  }).then((result) => ({
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }));
}

export class ApiDeployer {
  private readonly logger: Logger;
  private readonly commandRunner: ApiDeployerCommandRunner;
  private readonly packageRoot: string;

  constructor(
    _wrapper: InfraWrapper,
    _config: ConfigManager,
    options?: {
      logger?: Logger;
      commandRunner?: ApiDeployerCommandRunner;
      packageRoot?: string;
    }
  ) {
    this.logger =
      options?.logger ?? new Logger({ level: 'info', timestamps: true });
    this.commandRunner = options?.commandRunner ?? defaultCommandRunner;
    this.packageRoot =
      options?.packageRoot ?? path.resolve(__dirname, '..', '..');
  }

  async diff(config: ApiDeploymentConfig): Promise<void> {
    await this.runSst('diff', config);
  }

  async deploy(config: ApiDeploymentConfig): Promise<ApiDeploymentResult> {
    await this.runSst('deploy', config);

    return {
      success: true,
      resourceId: `api-${config.stage ?? 'production'}`,
      url: `https://${config.domain}`,
      connectionDetails: {
        apiUrl: `https://${config.domain}`,
        graphqlUrl: `https://${config.domain}/graphql`,
        websocketUrl: `wss://${config.domain}/ws`,
        repositoryName: config.imageRepository,
      },
    };
  }

  private async runSst(
    action: 'deploy' | 'diff',
    config: ApiDeploymentConfig
  ): Promise<void> {
    this.validateDeploymentConfig(config);

    const bootstrapOnly = config.bootstrapOnly ?? false;
    const runtimeConfig =
      bootstrapOnly ? undefined : resolveApiRuntimeConfig(config);
    const env = buildApiSstEnvironment(config, runtimeConfig);
    const stage = config.stage ?? 'production';
    const useBootstrapHelper = action === 'deploy' && bootstrapOnly;
    const command = useBootstrapHelper ? 'bash' : 'pnpm';
    const args = useBootstrapHelper
      ? ['scripts/bootstrap-api.sh']
      : ['exec', 'sst', action, '--stage', stage];
    if (action === 'deploy' && !useBootstrapHelper) {
      args.push('--yes');
    }
    const logPrefix = useBootstrapHelper ? 'bootstrap helper' : `SST ${action}`;

    this.logger.info(`Running ${logPrefix} for API runtime`, {
      stage,
      bootstrapOnly,
      helper: useBootstrapHelper ? 'bootstrap-api.sh' : undefined,
      domain: config.domain,
      imageRepository: config.imageRepository,
    });

    try {
      const result = await this.commandRunner(command, args, {
        cwd: this.packageRoot,
        env: useBootstrapHelper ? { ...env, SST_STAGE: stage } : env,
      });

      this.logger.info(
        useBootstrapHelper ? 'Bootstrap helper completed' : `SST ${action} completed`,
        {
          stdout: result.stdout.trim() || undefined,
        }
      );
    } catch (error) {
      throw new DeploymentError(
        `API ${action} failed: ${error instanceof Error ? error.message : String(error)}`,
        'api',
        action
      );
    }
  }

  private validateDeploymentConfig(config: ApiDeploymentConfig): void {
    if (!config.domain) {
      throw new DeploymentError('domain is required', 'api', 'validation');
    }
    if (!config.region) {
      throw new DeploymentError('region is required', 'api', 'validation');
    }
    if (!config.imageRepository) {
      throw new DeploymentError('imageRepository is required', 'api', 'validation');
    }

    if (config.bootstrapOnly) {
      return;
    }

    try {
      resolveApiRuntimeConfig(config);
    } catch (error) {
      if (error instanceof DeploymentError) {
        throw error;
      }
      throw new DeploymentError(
        `Invalid API runtime configuration: ${error instanceof Error ? error.message : String(error)}`,
        'api',
        'validation'
      );
    }
  }
}
