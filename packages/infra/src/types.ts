/**
 * Type definitions for infrastructure deployment
 * @packageDocumentation
 */

/**
 * Result of a deployment operation
 * 
 * @remarks
 * This interface represents the outcome of any infrastructure deployment operation.
 * It includes success status, resource identifiers, URLs, and connection details.
 * 
 * @example
 * ```typescript
 * const result: DeploymentResult = {
 *   success: true,
 *   resourceId: 'authentik-prod-123',
 *   url: 'https://auth.example.com',
 *   connectionDetails: {
 *     adminUrl: 'https://auth.example.com/admin',
 *     clientId: 'oauth-client-123'
 *   }
 * };
 * ```
 */
export interface DeploymentResult {
  /** Whether the deployment succeeded */
  success: boolean;
  /** Unique identifier for the deployed resource */
  resourceId?: string;
  /** Public URL of the deployed resource */
  url?: string;
  /** Connection details for integration (URLs, endpoints, credentials) */
  connectionDetails?: Record<string, string>;
  /** Error message if deployment failed */
  error?: string;
}

/**
 * Options for deployment operations
 * 
 * @remarks
 * Specifies the target environment, region, and additional configuration
 * for infrastructure deployment operations.
 * 
 * @example
 * ```typescript
 * const options: DeploymentOptions = {
 *   environment: 'production',
 *   region: 'us-east-2',
 *   config: { enableBackups: true }
 * };
 * ```
 */
export interface DeploymentOptions {
  /** Target environment (e.g., 'development', 'staging', 'production') */
  environment: string;
  /** AWS region for deployment */
  region: string;
  /** Additional configuration parameters */
  config?: Record<string, any>;
}

/**
 * Information about a deployed resource
 * 
 * @remarks
 * Contains comprehensive information about a deployment including its status,
 * associated AWS resources, and metadata.
 */
export interface DeploymentInfo {
  /** Unique deployment identifier */
  id: string;
  /** Type of deployment */
  type: 'authentik' | 'dashboard' | 'api';
  /** Environment name */
  environment: string;
  /** AWS region */
  region: string;
  /** Current deployment status */
  status: DeploymentStatus;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Associated AWS resources */
  resources: ResourceInfo[];
  /** Additional metadata */
  metadata: Record<string, any>;
}

/**
 * Deployment status enumeration
 * 
 * @remarks
 * Represents the current state of a deployment operation throughout its lifecycle.
 */
export enum DeploymentStatus {
  /** Deployment is queued but not yet started */
  PENDING = 'pending',
  /** Deployment is currently in progress */
  IN_PROGRESS = 'in_progress',
  /** Deployment completed successfully */
  COMPLETED = 'completed',
  /** Deployment failed */
  FAILED = 'failed',
  /** Deployment was rolled back due to failure */
  ROLLED_BACK = 'rolled_back'
}

/**
 * Information about an AWS resource
 * 
 * @remarks
 * Describes a single AWS resource that is part of a deployment.
 */
export interface ResourceInfo {
  /** Resource type (e.g., 'ec2', 's3', 'cloudfront') */
  type: string;
  /** AWS resource ID */
  id: string;
  /** AWS ARN */
  arn?: string;
  /** Public URL if applicable */
  url?: string;
}

/**
 * Main infrastructure configuration
 * 
 * @remarks
 * Top-level configuration object that contains all settings required for
 * infrastructure deployment operations. This includes AWS credentials,
 * service-specific configurations, IAC module settings, and logging preferences.
 * 
 * @example
 * ```typescript
 * const config: InfraConfig = {
 *   aws: {
 *     region: 'us-east-2',
 *     profile: 'default'
 *   },
 *   authentik: {
 *     domain: 'auth.example.com',
 *     adminEmail: 'admin@example.com'
 *   },
 *   dashboard: {
 *     buildPath: './apps/dashboard/.next',
 *     authentikIntegration: true
 *   },
 *   iac: {
 *     modulesPath: 'packages/iac',
 *     networkingModule: 'networking',
 *     computeModule: 'compute'
 *   },
 *   logging: {
 *     level: 'info',
 *     timestamps: true
 *   }
 * };
 * ```
 */
export interface InfraConfig {
  /** AWS configuration */
  aws: AWSConfig;
  /** Authentik configuration */
  authentik?: AuthentikConfig;
  /** Dashboard configuration */
  dashboard?: DashboardConfig;
  /** API runtime configuration */
  api?: ApiDeploymentConfig;
  /** IAC module configuration */
  iac: IACConfig;
  /** Logging configuration */
  logging: LoggingConfig;
}

/**
 * AWS configuration
 * 
 * @remarks
 * Specifies AWS credentials and region settings for infrastructure deployment.
 * The accountId can be auto-detected if not provided.
 * 
 * @example
 * ```typescript
 * const awsConfig: AWSConfig = {
 *   region: 'us-west-2',
 *   profile: 'production'
 * };
 * ```
 */
export interface AWSConfig {
  /** AWS region (e.g., 'us-east-2') */
  region: string;
  /** AWS account ID (optional, can be detected) */
  accountId?: string;
  /** AWS CLI profile name */
  profile?: string;
}

/**
 * Authentik configuration
 * 
 * @remarks
 * Configuration for deploying the Authentik authentication provider.
 * VPC and subnet IDs are optional and will use IAC module defaults if not provided.
 * 
 * @example
 * ```typescript
 * const authentikConfig: AuthentikConfig = {
 *   domain: 'auth.cig.example.com',
 *   adminEmail: 'admin@example.com',
 *   vpcId: 'vpc-12345678'
 * };
 * ```
 */
export interface AuthentikConfig {
  /** Domain for Authentik (e.g., 'auth.cig.example.com') */
  domain: string;
  /** Admin email for initial setup */
  adminEmail: string;
  /** VPC ID (optional, will use IAC module default) */
  vpcId?: string;
  /** Subnet ID (optional, will use IAC module default) */
  subnetId?: string;
}

/**
 * Dashboard configuration
 * 
 * @remarks
 * Configuration for deploying the Next.js dashboard application.
 * Supports custom domains and Authentik authentication integration.
 * 
 * @example
 * ```typescript
 * const dashboardConfig: DashboardConfig = {
 *   buildPath: './apps/dashboard/.next',
 *   domain: 'dashboard.example.com',
 *   authentikIntegration: true
 * };
 * ```
 */
export interface DashboardConfig {
  /** Custom domain (optional) */
  domain?: string;
  /** Path to built dashboard files */
  buildPath: string;
  /** Enable Authentik integration */
  authentikIntegration: boolean;
}

/**
 * IAC module configuration
 * 
 * @remarks
 * Specifies paths and module names for integrating with @cig/iac Terraform modules.
 * These modules provide networking and compute infrastructure.
 * 
 * @example
 * ```typescript
 * const iacConfig: IACConfig = {
 *   modulesPath: 'packages/iac',
 *   networkingModule: 'networking',
 *   computeModule: 'compute'
 * };
 * ```
 */
export interface IACConfig {
  /** Path to @cig/iac modules */
  modulesPath: string;
  /** Networking module name */
  networkingModule: string;
  /** Compute module name */
  computeModule: string;
}

/**
 * Logging configuration
 * 
 * @remarks
 * Controls logging behavior including log level filtering and timestamp formatting.
 * 
 * @example
 * ```typescript
 * const loggingConfig: LoggingConfig = {
 *   level: 'info',
 *   timestamps: true
 * };
 * ```
 */
export interface LoggingConfig {
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
  /** Include timestamps in log messages */
  timestamps: boolean;
}

/**
 * Configuration validation result
 * 
 * @remarks
 * Returned by ConfigManager.validate() to indicate whether configuration is valid
 * and provide specific error messages for any validation failures.
 * 
 * @example
 * ```typescript
 * const result: ValidationResult = {
 *   valid: false,
 *   errors: ['aws.region is required', 'authentik.domain is required']
 * };
 * ```
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
}

/**
 * Authentik-specific deployment configuration
 * 
 * @remarks
 * Extended configuration specifically for Authentik deployment operations.
 * Includes all necessary parameters for provisioning Authentik to AWS.
 */
export interface AuthentikDeploymentConfig {
  /** Domain for Authentik */
  domain: string;
  /** Admin email */
  adminEmail: string;
  /** AWS region */
  region: string;
  /** Optional override for the Terraform modules root directory */
  iacModulesPath?: string;
  /** VPC ID (optional) */
  vpcId?: string;
  /** Subnet ID (optional) */
  subnetId?: string;
}

/**
 * Authentik deployment result
 * 
 * @remarks
 * Extended deployment result specifically for Authentik deployments.
 * Includes connection details needed for integrating other services with Authentik.
 */
export interface AuthentikDeploymentResult extends DeploymentResult {
  /** Connection details for Authentik */
  connectionDetails?: {
    /** Authentik URL */
    url: string;
    /** Admin URL */
    adminUrl: string;
    /** OAuth client ID */
    clientId?: string;
  };
}

/**
 * Blueprint result for Authentik deployments
 *
 * @remarks
 * Extends `AuthentikDeploymentResult` with the OIDC outputs produced by the
 * `authentik-aws` Terraform module: the issuer URL, OIDC client ID, and OIDC
 * client secret.  These values are required by the auth package to configure
 * the OIDC adapter in managed mode.
 */
export interface AuthentikBlueprintResult extends AuthentikDeploymentResult {
  /** Authentik OIDC issuer URL (e.g. https://auth.example.com/application/o/cig/) */
  issuerUrl: string;
  /** OIDC client ID registered in Authentik */
  oidcClientId: string;
  /** OIDC client secret registered in Authentik */
  oidcClientSecret: string;
}

/**
 * Dashboard-specific deployment configuration
 * 
 * @remarks
 * Extended configuration specifically for dashboard deployment operations.
 * Includes Authentik integration parameters for authentication.
 */
export interface DashboardDeploymentConfig {
  /** Path to built dashboard files */
  buildPath: string;
  /** Custom domain (optional) */
  domain?: string;
  /** AWS region */
  region: string;
  /** Optional override for the Terraform modules root directory */
  iacModulesPath?: string;
  /** Authentik URL for integration */
  authentikUrl: string;
  /** Authentik OAuth client ID */
  authentikClientId: string;
}

/**
 * Dashboard deployment result
 * 
 * @remarks
 * Extended deployment result specifically for dashboard deployments.
 * Always includes the deployed URL for accessing the dashboard.
 */
export interface DashboardDeploymentResult extends DeploymentResult {
  /** Deployed dashboard URL */
  url: string;
}

/**
 * Terraform module reference
 * 
 * @remarks
 * Specifies a reference to a Terraform module from @cig/iac along with
 * the variables to pass to that module during infrastructure provisioning.
 * 
 * @example
 * ```typescript
 * const moduleRef: TerraformModuleReference = {
 *   modulePath: 'packages/iac/modules/networking',
 *   variables: {
 *     vpc_cidr: '10.0.0.0/16',
 *     availability_zones: ['us-east-2a', 'us-east-2b']
 *   }
 * };
 * ```
 */
export interface TerraformModuleReference {
  /** Path to the Terraform module */
  modulePath: string;
  /** Variables to pass to the module */
  variables: Record<string, any>;
}

/**
 * Secret references required to connect the API runtime to Authentik.
 */
export interface ApiAuthentikSecretRefs {
  /** Secret ARN containing AUTHENTIK_ISSUER_URL */
  issuerUrlSecretArn: string;
  /** Secret ARN containing AUTHENTIK_JWKS_URI */
  jwksUriSecretArn: string;
  /** Secret ARN containing AUTHENTIK_TOKEN_ENDPOINT */
  tokenEndpointSecretArn: string;
  /** Secret ARN containing OIDC_CLIENT_ID */
  oidcClientIdSecretArn: string;
  /** Secret ARN containing OIDC_CLIENT_SECRET */
  oidcClientSecretSecretArn: string;
}

/**
 * Final resolved runtime configuration for the production API stack.
 *
 * This shape is intentionally complete: by the time SST deploys the ECS service,
 * network ids, secret references, and Neo4j outputs must already be known.
 */
export interface ApiRuntimeConfig {
  /** Public API domain, for example `api.cig.technology` */
  domain: string;
  /** AWS region used by the runtime */
  region: string;
  /** ECR repository name for the API image */
  imageRepository: string;
  /** Container port exposed by the API */
  containerPort: number;
  /** ECS task CPU units */
  cpu: number;
  /** ECS task memory in MiB */
  memoryMiB: number;
  /** Desired ECS task count */
  desiredCount: number;
  /** VPC id sourced from Terraform core-data outputs */
  vpcId: string;
  /** ALB security group id */
  albSecurityGroupId: string;
  /** Public subnet ids used by the ALB */
  publicSubnetIds: string[];
  /** Private subnet ids used by the ECS service */
  privateSubnetIds: string[];
  /** Whether ECS tasks receive public IPv4 addresses (used only for the hibernated public-subnet profile) */
  assignPublicIp?: boolean;
  /** Security group ids attached to the ECS service */
  securityGroupIds: string[];
  /** Secret ARN containing DATABASE_URL */
  databaseUrlSecretArn: string;
  /** Secret ARN containing JWT_SECRET */
  jwtSecretArn: string;
  /** Neo4j Bolt URI */
  neo4jBoltUri: string;
  /** Secret ARN containing the Neo4j password */
  neo4jPasswordSecretArn: string;
  /** Secret ARN containing OPENAI_API_KEY */
  openAiApiKeySecretArn: string;
  /** Authentik runtime secret references */
  authentikSecretRefs: ApiAuthentikSecretRefs;
  /** SMTP host used by the OTP backend */
  smtpHost: string;
  /** SMTP port used by the OTP backend */
  smtpPort: number;
  /** Whether the SMTP connection must use TLS */
  smtpSecure: boolean;
  /** From address used by the OTP backend */
  smtpFromEmail: string;
  /** Whether SMTP authentication is enabled */
  smtpAuthEnabled: boolean;
  /** Optional SMTP username, when different from the from address */
  smtpUser?: string;
  /** Optional OTP email subject */
  smtpOtpSubject?: string;
  /** Optional secret ARN containing the SMTP password */
  smtpPasswordSecretArn?: string;
  /** Browser origins allowed through CORS */
  corsOrigins: string[];
  /** Whether a production deploy may create/update native pipelines */
  createPipeline: boolean;
  /** Optional Route53 hosted zone override */
  hostedZoneDomain?: string;
  /** Optional existing ACM certificate ARN */
  certificateArn?: string;
  /** Health check path for the ALB target group */
  healthCheckPath?: string;
  /** Optional fully qualified image URI override */
  imageUri?: string;
  /** Optional image tag when imageUri is not provided */
  imageTag?: string;
  /** Optional secret ARN containing SUPABASE_URL */
  supabaseUrlSecretArn?: string;
  /** Optional secret ARN containing SUPABASE_SERVICE_ROLE_KEY */
  supabaseServiceRoleKeySecretArn?: string;
  /** Analytics provisioning mode */
  analyticsProvisioningMode?: 'local' | 'upstream';
  /** Private Umami service URL */
  umamiApiUrl?: string;
  /** Secret ARN containing the Umami provisioner API token */
  umamiApiTokenSecretArn?: string;
  /** Public collector URL */
  analyticsCollectorUrl?: string;
  /** Optional Umami team identifier */
  umamiTeamId?: string;
}

/**
 * Programmatic API deployment input.
 *
 * This shape is broader than `ApiRuntimeConfig` because bootstrap-only runs only
 * need the repository/domain/pipeline inputs, while a full deploy requires the
 * final runtime fields after Terraform outputs are merged in.
 */
export interface ApiDeploymentConfig {
  /** Public API domain */
  domain: string;
  /** AWS region */
  region: string;
  /** ECR repository name */
  imageRepository: string;
  /** Container port, defaults to 8080 in stack helpers */
  containerPort?: number;
  /** ECS task CPU units */
  cpu?: number;
  /** ECS task memory in MiB */
  memoryMiB?: number;
  /** Desired task count */
  desiredCount?: number;
  /** Optional VPC id override */
  vpcId?: string;
  /** Optional ALB security group id override */
  albSecurityGroupId?: string;
  /** Optional public subnet ids override */
  publicSubnetIds?: string[];
  /** Optional private subnet ids override */
  privateSubnetIds?: string[];
  /** Whether ECS tasks receive public IPv4 addresses */
  assignPublicIp?: boolean;
  /** Optional service security groups override */
  securityGroupIds?: string[];
  /** Secret ARN containing DATABASE_URL */
  databaseUrlSecretArn?: string;
  /** Secret ARN containing JWT_SECRET */
  jwtSecretArn?: string;
  /** Neo4j Bolt URI */
  neo4jBoltUri?: string;
  /** Secret ARN containing Neo4j password */
  neo4jPasswordSecretArn?: string;
  /** Secret ARN containing OPENAI_API_KEY */
  openAiApiKeySecretArn?: string;
  /** Authentik secret references */
  authentikSecretRefs?: Partial<ApiAuthentikSecretRefs>;
  /** SMTP host used by the OTP backend */
  smtpHost?: string;
  /** SMTP port used by the OTP backend */
  smtpPort?: number;
  /** Whether the SMTP connection must use TLS */
  smtpSecure?: boolean;
  /** From address used by the OTP backend */
  smtpFromEmail?: string;
  /** Whether SMTP authentication is enabled */
  smtpAuthEnabled?: boolean;
  /** Optional SMTP username, when different from the from address */
  smtpUser?: string;
  /** Optional OTP email subject */
  smtpOtpSubject?: string;
  /** Browser CORS origins */
  corsOrigins?: string[];
  /** Whether to create or update production pipelines */
  createPipeline?: boolean;
  /** Optional Route53 hosted zone override */
  hostedZoneDomain?: string;
  /** Optional existing certificate ARN */
  certificateArn?: string;
  /** ALB health check path override */
  healthCheckPath?: string;
  /** Optional image URI override */
  imageUri?: string;
  /** Optional image tag */
  imageTag?: string;
  /** Optional secret ARN containing the SMTP password */
  smtpPasswordSecretArn?: string;
  /** Optional stage override for SST */
  stage?: string;
  /** Optional SST app name override */
  appName?: string;
  /** Optional project tag/prefix override */
  projectTag?: string;
  /** Optional pipeline repo in owner/repo format */
  pipelineRepo?: string;
  /** Optional pipeline name prefix */
  pipelinePrefix?: string;
  /** Optional pipeline permission mode */
  pipelinePermissionsMode?: 'admin' | 'least-privilege';
  /** Optional production pipeline branch */
  pipelineBranchProduction?: string;
  /** Bootstrap-only mode creates the ECR repo and optional pipelines without the ECS runtime */
  bootstrapOnly?: boolean;
  /** Optional secret ARN containing SUPABASE_URL */
  supabaseUrlSecretArn?: string;
  /** Optional secret ARN containing SUPABASE_SERVICE_ROLE_KEY */
  supabaseServiceRoleKeySecretArn?: string;
  /** Analytics provisioning mode */
  analyticsProvisioningMode?: 'local' | 'upstream';
  /** Private Umami service URL */
  umamiApiUrl?: string;
  /** Secret ARN containing the Umami provisioner API token */
  umamiApiTokenSecretArn?: string;
  /** Public collector URL */
  analyticsCollectorUrl?: string;
  /** Optional Umami team identifier */
  umamiTeamId?: string;
}

/**
 * Result returned after a successful API deployment.
 */
export interface ApiDeploymentResult extends DeploymentResult {
  /** Public API URL */
  url: string;
  /** Deployment identifier */
  resourceId: string;
  /** API-specific connection details */
  connectionDetails: {
    /** Public API base URL */
    apiUrl: string;
    /** GraphQL endpoint */
    graphqlUrl: string;
    /** WebSocket endpoint */
    websocketUrl: string;
    /** ECR repository name */
    repositoryName: string;
  };
}

/**
 * Terraform outputs produced by the API core-data environment.
 */
export interface ApiCoreTerraformOutputs {
  /** Provisioned VPC id */
  vpcId: string;
  /** Public subnet ids for the ALB */
  publicSubnetIds: string[];
  /** Private subnet ids for the ECS service */
  privateSubnetIds: string[];
  /** ALB security group id */
  albSecurityGroupId: string;
  /** API service security group id */
  apiServiceSecurityGroupId: string;
  /** Neo4j security group id */
  neo4jSecurityGroupId: string;
  /** Neo4j Bolt URI */
  neo4jBoltUri: string;
  /** Secret ARN containing the Neo4j password */
  neo4jPasswordSecretArn: string;
}
