import { DeploymentError } from '../errors.js';
import {
  ApiAuthentikSecretRefs,
  ApiCoreTerraformOutputs,
  ApiDeploymentConfig,
  ApiRuntimeConfig,
} from '../types.js';

type TerraformOutputEnvelope<T> = T | { value: T };

function unwrapOutput<T>(value: TerraformOutputEnvelope<T> | undefined, name: string): T {
  if (value === undefined || value === null) {
    throw new DeploymentError(
      `Missing Terraform output: ${name}`,
      'api',
      'terraform-outputs'
    );
  }

  if (typeof value === 'object' && value !== null && 'value' in value) {
    return (value as { value: T }).value;
  }

  return value as T;
}

function requireString(value: string | undefined, name: string): string {
  if (!value || value.trim() === '') {
    throw new DeploymentError(`${name} is required`, 'api', 'validation');
  }
  return value;
}

function requireStringArray(value: string[] | undefined, name: string): string[] {
  if (!value || value.length === 0) {
    throw new DeploymentError(`${name} is required`, 'api', 'validation');
  }
  return value;
}

function requireNumber(value: number | undefined, name: string): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new DeploymentError(`${name} is required`, 'api', 'validation');
  }
  return value;
}

function requireBoolean(value: boolean | undefined, name: string): boolean {
  if (value === undefined) {
    throw new DeploymentError(`${name} is required`, 'api', 'validation');
  }

  return value;
}

function resolveAuthentikSecretRefs(
  refs: Partial<ApiAuthentikSecretRefs> | undefined
): ApiAuthentikSecretRefs {
  return {
    issuerUrlSecretArn: requireString(refs?.issuerUrlSecretArn, 'authentikSecretRefs.issuerUrlSecretArn'),
    jwksUriSecretArn: requireString(refs?.jwksUriSecretArn, 'authentikSecretRefs.jwksUriSecretArn'),
    tokenEndpointSecretArn: requireString(
      refs?.tokenEndpointSecretArn,
      'authentikSecretRefs.tokenEndpointSecretArn'
    ),
    oidcClientIdSecretArn: requireString(
      refs?.oidcClientIdSecretArn,
      'authentikSecretRefs.oidcClientIdSecretArn'
    ),
    oidcClientSecretSecretArn: requireString(
      refs?.oidcClientSecretSecretArn,
      'authentikSecretRefs.oidcClientSecretSecretArn'
    ),
  };
}

export function parseApiCoreTerraformOutputs(
  input: string | Record<string, unknown>
): ApiCoreTerraformOutputs {
  const parsed =
    typeof input === 'string'
      ? (JSON.parse(input) as Record<string, unknown>)
      : input;

  return {
    vpcId: unwrapOutput(parsed['vpc_id'] as TerraformOutputEnvelope<string> | undefined, 'vpc_id'),
    publicSubnetIds: unwrapOutput(
      parsed['public_subnet_ids'] as TerraformOutputEnvelope<string[]> | undefined,
      'public_subnet_ids'
    ),
    privateSubnetIds: unwrapOutput(
      parsed['private_subnet_ids'] as TerraformOutputEnvelope<string[]> | undefined,
      'private_subnet_ids'
    ),
    albSecurityGroupId: unwrapOutput(
      parsed['alb_security_group_id'] as TerraformOutputEnvelope<string> | undefined,
      'alb_security_group_id'
    ),
    apiServiceSecurityGroupId: unwrapOutput(
      parsed['api_service_security_group_id'] as TerraformOutputEnvelope<string> | undefined,
      'api_service_security_group_id'
    ),
    neo4jSecurityGroupId: unwrapOutput(
      parsed['neo4j_security_group_id'] as TerraformOutputEnvelope<string> | undefined,
      'neo4j_security_group_id'
    ),
    neo4jBoltUri: unwrapOutput(
      parsed['neo4j_bolt_uri'] as TerraformOutputEnvelope<string> | undefined,
      'neo4j_bolt_uri'
    ),
    neo4jPasswordSecretArn: unwrapOutput(
      parsed['neo4j_password_secret_arn'] as TerraformOutputEnvelope<string> | undefined,
      'neo4j_password_secret_arn'
    ),
  };
}

export function resolveApiRuntimeConfig(
  config: ApiDeploymentConfig,
  outputs?: ApiCoreTerraformOutputs
): ApiRuntimeConfig {
  return {
    domain: requireString(config.domain, 'domain'),
    region: requireString(config.region, 'region'),
    imageRepository: requireString(config.imageRepository, 'imageRepository'),
    containerPort: requireNumber(config.containerPort, 'containerPort'),
    cpu: requireNumber(config.cpu, 'cpu'),
    memoryMiB: requireNumber(config.memoryMiB, 'memoryMiB'),
    desiredCount: requireNumber(config.desiredCount, 'desiredCount'),
    vpcId: requireString(config.vpcId ?? outputs?.vpcId, 'vpcId'),
    albSecurityGroupId: requireString(
      config.albSecurityGroupId ?? outputs?.albSecurityGroupId,
      'albSecurityGroupId'
    ),
    publicSubnetIds: requireStringArray(
      config.publicSubnetIds ?? outputs?.publicSubnetIds,
      'publicSubnetIds'
    ),
    privateSubnetIds: requireStringArray(
      config.privateSubnetIds ?? outputs?.privateSubnetIds,
      'privateSubnetIds'
    ),
    assignPublicIp: config.assignPublicIp ?? false,
    securityGroupIds: requireStringArray(
      config.securityGroupIds ?? (outputs?.apiServiceSecurityGroupId ? [outputs.apiServiceSecurityGroupId] : undefined),
      'securityGroupIds'
    ),
    databaseUrlSecretArn: requireString(config.databaseUrlSecretArn, 'databaseUrlSecretArn'),
    jwtSecretArn: requireString(config.jwtSecretArn, 'jwtSecretArn'),
    neo4jBoltUri: requireString(config.neo4jBoltUri ?? outputs?.neo4jBoltUri, 'neo4jBoltUri'),
    neo4jPasswordSecretArn: requireString(
      config.neo4jPasswordSecretArn ?? outputs?.neo4jPasswordSecretArn,
      'neo4jPasswordSecretArn'
    ),
    openAiApiKeySecretArn: requireString(
      config.openAiApiKeySecretArn,
      'openAiApiKeySecretArn'
    ),
    authentikSecretRefs: resolveAuthentikSecretRefs(config.authentikSecretRefs),
    smtpHost: requireString(config.smtpHost, 'smtpHost'),
    smtpPort: requireNumber(config.smtpPort, 'smtpPort'),
    smtpSecure: requireBoolean(config.smtpSecure, 'smtpSecure'),
    smtpFromEmail: requireString(config.smtpFromEmail, 'smtpFromEmail'),
    smtpAuthEnabled: requireBoolean(config.smtpAuthEnabled, 'smtpAuthEnabled'),
    smtpUser: config.smtpUser?.trim() || undefined,
    smtpOtpSubject: config.smtpOtpSubject?.trim() || undefined,
    smtpPasswordSecretArn: config.smtpAuthEnabled === false
      ? config.smtpPasswordSecretArn?.trim() || undefined
      : requireString(config.smtpPasswordSecretArn, 'smtpPasswordSecretArn'),
    corsOrigins: requireStringArray(config.corsOrigins, 'corsOrigins'),
    createPipeline: config.createPipeline ?? false,
    hostedZoneDomain: config.hostedZoneDomain,
    certificateArn: config.certificateArn,
    healthCheckPath: config.healthCheckPath,
    imageUri: config.imageUri,
    imageTag: config.imageTag,
    supabaseUrlSecretArn: config.supabaseUrlSecretArn,
    supabaseServiceRoleKeySecretArn: config.supabaseServiceRoleKeySecretArn,
    analyticsProvisioningMode: config.analyticsProvisioningMode ?? 'local',
    umamiApiUrl: config.umamiApiUrl,
    umamiApiTokenSecretArn: config.umamiApiTokenSecretArn,
    analyticsCollectorUrl: config.analyticsCollectorUrl,
    umamiTeamId: config.umamiTeamId,
  };
}
