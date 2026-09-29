/**
 * Configuration management for infrastructure deployment
 * @packageDocumentation
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import {
  InfraConfig,
  ValidationResult,
  AWSConfig,
  AuthentikConfig,
  DashboardConfig,
  ApiDeploymentConfig,
  ApiAuthentikSecretRefs,
  IACConfig,
  LoggingConfig
} from '../types';
import { ConfigValidationError } from '../errors';

/**
 * Manages configuration loading, validation, and environment-specific overrides
 * 
 * @remarks
 * ConfigManager handles loading configuration from multiple sources (environment variables,
 * configuration files) and merging them with environment-specific overrides. It validates
 * that all required configuration parameters are present before deployment operations.
 * 
 * @example
 * ```typescript
 * const configManager = new ConfigManager();
 * const config = configManager.load('production');
 * const validation = configManager.validate(config);
 * if (!validation.valid) {
 *   throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
 * }
 * ```
 */
export class ConfigManager {
  private configCache: Map<string, InfraConfig> = new Map();

  private parseCsv(value?: string): string[] | undefined {
    if (!value) {
      return undefined;
    }

    const values = value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    return values.length > 0 ? values : undefined;
  }

  private parseNumber(value?: string): number | undefined {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseBoolean(value?: string): boolean | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value === 'true';
  }

  /**
   * Load configuration from multiple sources
   * 
   * @param environment - Target environment name (e.g., 'development', 'production')
   * @returns Complete infrastructure configuration
   * 
   * @remarks
   * Configuration is loaded and merged in the following order (later sources override earlier):
   * 1. Environment variables
   * 2. Configuration file (if exists)
   * 3. Environment-specific overrides
   * 
   * The merged configuration is cached per environment for performance.
   */
  load(environment: string): InfraConfig {
    // Check cache first
    if (this.configCache.has(environment)) {
      return this.configCache.get(environment)!;
    }

    // Load from multiple sources
    const envConfig = this.loadFromEnv();
    const fileConfig = this.loadFromFile(`config/${environment}.json`);
    const overrides = this.getEnvironmentOverrides(environment);

    // Merge configurations (later sources override earlier)
    const merged = this.mergeConfigs(envConfig, fileConfig, overrides);

    // Validate before caching
    const validation = this.validate(merged);
    if (!validation.valid) {
      throw new ConfigValidationError(
        `Configuration validation failed: ${validation.errors.join(', ')}`,
        validation.errors
      );
    }

    // Cache and return
    this.configCache.set(environment, merged as InfraConfig);
    return merged as InfraConfig;
  }

  /**
   * Load configuration from environment variables
   * 
   * @returns Partial configuration from environment variables
   * 
   * @remarks
   * Reads configuration from environment variables with the following naming convention:
   * - AWS_REGION, AWS_ACCOUNT_ID, AWS_PROFILE
   * - AUTHENTIK_DOMAIN, AUTHENTIK_ADMIN_EMAIL, AUTHENTIK_VPC_ID, AUTHENTIK_SUBNET_ID
   * - DASHBOARD_DOMAIN, DASHBOARD_BUILD_PATH, DASHBOARD_AUTHENTIK_INTEGRATION
   * - IAC_MODULES_PATH, IAC_NETWORKING_MODULE, IAC_COMPUTE_MODULE
   * - LOG_LEVEL, LOG_TIMESTAMPS
   */
  loadFromEnv(): Partial<InfraConfig> {
    const config: Partial<InfraConfig> = {};

    // AWS configuration
    if (process.env.AWS_REGION || process.env.AWS_ACCOUNT_ID || process.env.AWS_PROFILE) {
      config.aws = {} as AWSConfig;
      if (process.env.AWS_REGION) {
        config.aws.region = process.env.AWS_REGION;
      }
      if (process.env.AWS_ACCOUNT_ID) {
        config.aws.accountId = process.env.AWS_ACCOUNT_ID;
      }
      if (process.env.AWS_PROFILE) {
        config.aws.profile = process.env.AWS_PROFILE;
      }
    }

    // Authentik configuration
    if (
      process.env.AUTHENTIK_DOMAIN ||
      process.env.AUTHENTIK_ADMIN_EMAIL ||
      process.env.AUTHENTIK_VPC_ID ||
      process.env.AUTHENTIK_SUBNET_ID
    ) {
      config.authentik = {} as AuthentikConfig;
      if (process.env.AUTHENTIK_DOMAIN) {
        config.authentik.domain = process.env.AUTHENTIK_DOMAIN;
      }
      if (process.env.AUTHENTIK_ADMIN_EMAIL) {
        config.authentik.adminEmail = process.env.AUTHENTIK_ADMIN_EMAIL;
      }
      if (process.env.AUTHENTIK_VPC_ID) {
        config.authentik.vpcId = process.env.AUTHENTIK_VPC_ID;
      }
      if (process.env.AUTHENTIK_SUBNET_ID) {
        config.authentik.subnetId = process.env.AUTHENTIK_SUBNET_ID;
      }
    }

    // Dashboard configuration
    if (
      process.env.DASHBOARD_DOMAIN ||
      process.env.DASHBOARD_BUILD_PATH ||
      process.env.DASHBOARD_AUTHENTIK_INTEGRATION
    ) {
      config.dashboard = {} as DashboardConfig;
      if (process.env.DASHBOARD_DOMAIN) {
        config.dashboard.domain = process.env.DASHBOARD_DOMAIN;
      }
      if (process.env.DASHBOARD_BUILD_PATH) {
        config.dashboard.buildPath = process.env.DASHBOARD_BUILD_PATH;
      }
      if (process.env.DASHBOARD_AUTHENTIK_INTEGRATION) {
        config.dashboard.authentikIntegration =
          process.env.DASHBOARD_AUTHENTIK_INTEGRATION === 'true';
      }
    }

    // API runtime configuration
    if (
      process.env.API_DOMAIN ||
      process.env.API_REGION ||
      process.env.API_IMAGE_REPOSITORY ||
      process.env.API_CONTAINER_PORT ||
      process.env.API_CPU ||
      process.env.API_MEMORY_MIB ||
      process.env.API_DESIRED_COUNT ||
      process.env.API_VPC_ID ||
      process.env.API_ALB_SECURITY_GROUP_ID ||
      process.env.API_PUBLIC_SUBNET_IDS ||
      process.env.API_PRIVATE_SUBNET_IDS ||
      process.env.API_SECURITY_GROUP_IDS ||
      process.env.API_DATABASE_URL_SECRET_ARN ||
      process.env.API_JWT_SECRET_ARN ||
      process.env.API_NEO4J_BOLT_URI ||
      process.env.API_NEO4J_PASSWORD_SECRET_ARN ||
      process.env.API_OPENAI_API_KEY_SECRET_ARN ||
      process.env.API_AUTHENTIK_ISSUER_URL_SECRET_ARN ||
      process.env.API_AUTHENTIK_JWKS_URI_SECRET_ARN ||
      process.env.API_AUTHENTIK_TOKEN_ENDPOINT_SECRET_ARN ||
      process.env.API_OIDC_CLIENT_ID_SECRET_ARN ||
      process.env.API_OIDC_CLIENT_SECRET_SECRET_ARN ||
      process.env.API_CORS_ORIGINS ||
      process.env.API_CREATE_PIPELINE ||
      process.env.API_HOSTED_ZONE_DOMAIN ||
      process.env.API_CERTIFICATE_ARN ||
      process.env.API_HEALTH_CHECK_PATH ||
      process.env.API_IMAGE_URI ||
      process.env.API_IMAGE_TAG ||
      process.env.API_STAGE ||
      process.env.API_APP_NAME ||
      process.env.API_PIPELINE_REPO ||
      process.env.API_PIPELINE_PREFIX ||
      process.env.API_PROJECT_TAG ||
      process.env.API_PIPELINE_PERMISSIONS_MODE ||
      process.env.API_PIPELINE_BRANCH_PRODUCTION ||
      process.env.API_BOOTSTRAP_ONLY ||
      process.env.API_SUPABASE_URL_SECRET_ARN ||
      process.env.API_SUPABASE_SERVICE_ROLE_KEY_SECRET_ARN ||
      process.env.API_SMTP_HOST ||
      process.env.API_SMTP_PORT ||
      process.env.API_SMTP_SECURE ||
      process.env.API_SMTP_FROM_EMAIL ||
      process.env.API_SMTP_AUTH_ENABLED ||
      process.env.API_SMTP_USER ||
      process.env.API_SMTP_OTP_SUBJECT ||
      process.env.API_SMTP_PASSWORD_SECRET_ARN
    ) {
      config.api = {} as ApiDeploymentConfig;
      const apiRegion = process.env.API_REGION ?? process.env.AWS_REGION;
      if (apiRegion) {
        config.api.region = apiRegion;
      }

      if (process.env.API_DOMAIN) {
        config.api.domain = process.env.API_DOMAIN;
      }
      if (process.env.API_IMAGE_REPOSITORY) {
        config.api.imageRepository = process.env.API_IMAGE_REPOSITORY;
      }
      if (process.env.API_CONTAINER_PORT) {
        config.api.containerPort = this.parseNumber(process.env.API_CONTAINER_PORT);
      }
      if (process.env.API_CPU) {
        config.api.cpu = this.parseNumber(process.env.API_CPU);
      }
      if (process.env.API_MEMORY_MIB) {
        config.api.memoryMiB = this.parseNumber(process.env.API_MEMORY_MIB);
      }
      if (process.env.API_DESIRED_COUNT) {
        config.api.desiredCount = this.parseNumber(process.env.API_DESIRED_COUNT);
      }
      if (process.env.API_VPC_ID) {
        config.api.vpcId = process.env.API_VPC_ID;
      }
      if (process.env.API_ALB_SECURITY_GROUP_ID) {
        config.api.albSecurityGroupId = process.env.API_ALB_SECURITY_GROUP_ID;
      }
      config.api.publicSubnetIds = this.parseCsv(process.env.API_PUBLIC_SUBNET_IDS);
      config.api.privateSubnetIds = this.parseCsv(process.env.API_PRIVATE_SUBNET_IDS);
      config.api.securityGroupIds = this.parseCsv(process.env.API_SECURITY_GROUP_IDS);
      if (process.env.API_DATABASE_URL_SECRET_ARN) {
        config.api.databaseUrlSecretArn = process.env.API_DATABASE_URL_SECRET_ARN;
      }
      if (process.env.API_JWT_SECRET_ARN) {
        config.api.jwtSecretArn = process.env.API_JWT_SECRET_ARN;
      }
      if (process.env.API_NEO4J_BOLT_URI) {
        config.api.neo4jBoltUri = process.env.API_NEO4J_BOLT_URI;
      }
      if (process.env.API_NEO4J_PASSWORD_SECRET_ARN) {
        config.api.neo4jPasswordSecretArn = process.env.API_NEO4J_PASSWORD_SECRET_ARN;
      }
      if (process.env.API_OPENAI_API_KEY_SECRET_ARN) {
        config.api.openAiApiKeySecretArn = process.env.API_OPENAI_API_KEY_SECRET_ARN;
      }

      const authentikRefs: Partial<ApiAuthentikSecretRefs> = {};
      if (process.env.API_AUTHENTIK_ISSUER_URL_SECRET_ARN) {
        authentikRefs.issuerUrlSecretArn = process.env.API_AUTHENTIK_ISSUER_URL_SECRET_ARN;
      }
      if (process.env.API_AUTHENTIK_JWKS_URI_SECRET_ARN) {
        authentikRefs.jwksUriSecretArn = process.env.API_AUTHENTIK_JWKS_URI_SECRET_ARN;
      }
      if (process.env.API_AUTHENTIK_TOKEN_ENDPOINT_SECRET_ARN) {
        authentikRefs.tokenEndpointSecretArn =
          process.env.API_AUTHENTIK_TOKEN_ENDPOINT_SECRET_ARN;
      }
      if (process.env.API_OIDC_CLIENT_ID_SECRET_ARN) {
        authentikRefs.oidcClientIdSecretArn = process.env.API_OIDC_CLIENT_ID_SECRET_ARN;
      }
      if (process.env.API_OIDC_CLIENT_SECRET_SECRET_ARN) {
        authentikRefs.oidcClientSecretSecretArn =
          process.env.API_OIDC_CLIENT_SECRET_SECRET_ARN;
      }
      if (Object.keys(authentikRefs).length > 0) {
        config.api.authentikSecretRefs = authentikRefs;
      }

      config.api.corsOrigins = this.parseCsv(process.env.API_CORS_ORIGINS);
      const createPipeline = this.parseBoolean(process.env.API_CREATE_PIPELINE);
      if (createPipeline !== undefined) {
        config.api.createPipeline = createPipeline;
      }
      if (process.env.API_HOSTED_ZONE_DOMAIN) {
        config.api.hostedZoneDomain = process.env.API_HOSTED_ZONE_DOMAIN;
      }
      if (process.env.API_CERTIFICATE_ARN) {
        config.api.certificateArn = process.env.API_CERTIFICATE_ARN;
      }
      if (process.env.API_HEALTH_CHECK_PATH) {
        config.api.healthCheckPath = process.env.API_HEALTH_CHECK_PATH;
      }
      if (process.env.API_IMAGE_URI) {
        config.api.imageUri = process.env.API_IMAGE_URI;
      }
      if (process.env.API_IMAGE_TAG) {
        config.api.imageTag = process.env.API_IMAGE_TAG;
      }
      if (process.env.API_STAGE) {
        config.api.stage = process.env.API_STAGE;
      }
      if (process.env.API_APP_NAME) {
        config.api.appName = process.env.API_APP_NAME;
      }
      if (process.env.API_PIPELINE_REPO) {
        config.api.pipelineRepo = process.env.API_PIPELINE_REPO;
      }
      if (process.env.API_PIPELINE_PREFIX) {
        config.api.pipelinePrefix = process.env.API_PIPELINE_PREFIX;
      }
      if (process.env.API_PROJECT_TAG) {
        config.api.projectTag = process.env.API_PROJECT_TAG;
      }
      if (process.env.API_PIPELINE_PERMISSIONS_MODE) {
        config.api.pipelinePermissionsMode =
          process.env.API_PIPELINE_PERMISSIONS_MODE === 'least-privilege'
            ? 'least-privilege'
            : 'admin';
      }
      if (process.env.API_PIPELINE_BRANCH_PRODUCTION) {
        config.api.pipelineBranchProduction = process.env.API_PIPELINE_BRANCH_PRODUCTION;
      }
      const bootstrapOnly = this.parseBoolean(process.env.API_BOOTSTRAP_ONLY);
      if (bootstrapOnly !== undefined) {
        config.api.bootstrapOnly = bootstrapOnly;
      }
      if (process.env.API_SUPABASE_URL_SECRET_ARN) {
        config.api.supabaseUrlSecretArn = process.env.API_SUPABASE_URL_SECRET_ARN;
      }
      if (process.env.API_SUPABASE_SERVICE_ROLE_KEY_SECRET_ARN) {
        config.api.supabaseServiceRoleKeySecretArn =
          process.env.API_SUPABASE_SERVICE_ROLE_KEY_SECRET_ARN;
      }
      if (process.env.API_SMTP_HOST) {
        config.api.smtpHost = process.env.API_SMTP_HOST.trim();
      }
      if (process.env.API_SMTP_PORT) {
        config.api.smtpPort = this.parseNumber(process.env.API_SMTP_PORT);
      }
      if (process.env.API_SMTP_SECURE) {
        config.api.smtpSecure = process.env.API_SMTP_SECURE === 'true';
      }
      if (process.env.API_SMTP_FROM_EMAIL) {
        config.api.smtpFromEmail = process.env.API_SMTP_FROM_EMAIL.trim();
      }
      if (process.env.API_SMTP_AUTH_ENABLED) {
        config.api.smtpAuthEnabled = process.env.API_SMTP_AUTH_ENABLED === 'true';
      }
      if (process.env.API_SMTP_USER) {
        config.api.smtpUser = process.env.API_SMTP_USER.trim();
      }
      if (process.env.API_SMTP_OTP_SUBJECT) {
        config.api.smtpOtpSubject = process.env.API_SMTP_OTP_SUBJECT.trim();
      }
      if (process.env.API_SMTP_PASSWORD_SECRET_ARN) {
        config.api.smtpPasswordSecretArn = process.env.API_SMTP_PASSWORD_SECRET_ARN.trim();
      }
      if (process.env.API_ASSIGN_PUBLIC_IP) {
        config.api.assignPublicIp = this.parseBoolean(process.env.API_ASSIGN_PUBLIC_IP);
      }
      if (process.env.ANALYTICS_PROVISIONING_MODE) {
        config.api.analyticsProvisioningMode = process.env.ANALYTICS_PROVISIONING_MODE as
          | 'local'
          | 'upstream';
      }
      if (process.env.UMAMI_API_URL) {
        config.api.umamiApiUrl = process.env.UMAMI_API_URL.trim();
      }
      if (process.env.API_UMAMI_API_TOKEN_SECRET_ARN) {
        config.api.umamiApiTokenSecretArn = process.env.API_UMAMI_API_TOKEN_SECRET_ARN.trim();
      }
      if (process.env.ANALYTICS_COLLECTOR_URL) {
        config.api.analyticsCollectorUrl = process.env.ANALYTICS_COLLECTOR_URL.trim();
      }
      if (process.env.UMAMI_TEAM_ID) {
        config.api.umamiTeamId = process.env.UMAMI_TEAM_ID.trim();
      }
    }

    // IAC configuration
    if (
      process.env.IAC_MODULES_PATH ||
      process.env.IAC_NETWORKING_MODULE ||
      process.env.IAC_COMPUTE_MODULE
    ) {
      config.iac = {} as IACConfig;
      if (process.env.IAC_MODULES_PATH) {
        config.iac.modulesPath = process.env.IAC_MODULES_PATH;
      }
      if (process.env.IAC_NETWORKING_MODULE) {
        config.iac.networkingModule = process.env.IAC_NETWORKING_MODULE;
      }
      if (process.env.IAC_COMPUTE_MODULE) {
        config.iac.computeModule = process.env.IAC_COMPUTE_MODULE;
      }
    }

    // Logging configuration
    if (process.env.LOG_LEVEL || process.env.LOG_TIMESTAMPS) {
      config.logging = {} as LoggingConfig;
      if (process.env.LOG_LEVEL) {
        const level = process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error';
        config.logging.level = level;
      }
      if (process.env.LOG_TIMESTAMPS) {
        config.logging.timestamps = process.env.LOG_TIMESTAMPS === 'true';
      }
    }

    return config;
  }

  /**
   * Load configuration from a JSON or YAML file
   * 
   * @param path - Path to configuration file (relative to process.cwd())
   * @returns Partial configuration from file, or empty object if file doesn't exist
   * 
   * @remarks
   * Supports both JSON and YAML formats. File format is determined by extension.
   * If the file doesn't exist, returns an empty object without throwing an error.
   * Invalid JSON/YAML will throw a parsing error.
   */
  loadFromFile(path: string): Partial<InfraConfig> {
    const fullPath = resolve(process.cwd(), path);

    if (!existsSync(fullPath)) {
      return {};
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');

      // Determine format by extension
      if (path.endsWith('.json')) {
        return JSON.parse(content);
      } else if (path.endsWith('.yaml') || path.endsWith('.yml')) {
        // For YAML support, we'd need a YAML parser library
        // For now, we'll just support JSON
        throw new Error('YAML support not yet implemented. Please use JSON configuration files.');
      }

      // Try JSON as default
      return JSON.parse(content);
    } catch (error) {
      throw new Error(
        `Failed to load configuration from ${path}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate configuration completeness
   * 
   * @param config - Configuration object to validate
   * @returns Validation result with list of errors
   * 
   * @remarks
   * Checks that the shared foundation fields are present:
   * - aws.region (required)
   * - iac.modulesPath (required)
   * - iac.networkingModule (required)
   * - iac.computeModule (required)
   * - logging.level (required)
   * - logging.timestamps (required)
   *
   * Service sections (`authentik`, `dashboard`, `api`) are optional at the root
   * level. When present, they are validated for the fields they own.
   */
  validate(config: Partial<InfraConfig>): ValidationResult {
    const errors: string[] = [];

    // Validate AWS configuration
    if (!config.aws) {
      errors.push('aws configuration is required');
    } else {
      if (!config.aws.region) {
        errors.push('aws.region is required');
      }
    }

    // Validate Authentik configuration when present
    if (config.authentik) {
      if (!config.authentik.domain) {
        errors.push('authentik.domain is required');
      }
      if (!config.authentik.adminEmail) {
        errors.push('authentik.adminEmail is required');
      }
    }

    // Validate Dashboard configuration when present
    if (config.dashboard) {
      if (!config.dashboard.buildPath) {
        errors.push('dashboard.buildPath is required');
      }
      if (config.dashboard.authentikIntegration === undefined) {
        errors.push('dashboard.authentikIntegration is required');
      }
    }

    // Validate API configuration when present
    if (config.api) {
      if (!config.api.domain) {
        errors.push('api.domain is required');
      }
      if (!config.api.region) {
        errors.push('api.region is required');
      }
      if (!config.api.imageRepository) {
        errors.push('api.imageRepository is required');
      }
    }

    // Validate IAC configuration
    if (!config.iac) {
      errors.push('iac configuration is required');
    } else {
      if (!config.iac.modulesPath) {
        errors.push('iac.modulesPath is required');
      }
      if (!config.iac.networkingModule) {
        errors.push('iac.networkingModule is required');
      }
      if (!config.iac.computeModule) {
        errors.push('iac.computeModule is required');
      }
    }

    // Validate Logging configuration
    if (!config.logging) {
      errors.push('logging configuration is required');
    } else {
      if (!config.logging.level) {
        errors.push('logging.level is required');
      }
      if (config.logging.timestamps === undefined) {
        errors.push('logging.timestamps is required');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get environment-specific configuration overrides
   * 
   * @param environment - Environment name
   * @returns Partial configuration with environment-specific overrides
   * 
   * @remarks
   * Provides environment-specific defaults and overrides. For example:
   * - 'development': Uses local paths, debug logging
   * - 'production': Uses production domains, info logging
   * - 'staging': Uses staging domains, info logging
   * 
   * These overrides are applied last and take precedence over other configuration sources.
   */
  getEnvironmentOverrides(environment: string): Partial<InfraConfig> {
    const overrides: Partial<InfraConfig> = {};

    switch (environment.toLowerCase()) {
      case 'development':
      case 'dev':
        overrides.logging = {
          level: 'debug',
          timestamps: true
        };
        break;

      case 'staging':
      case 'stage':
        overrides.logging = {
          level: 'info',
          timestamps: true
        };
        break;

      case 'production':
      case 'prod':
        overrides.logging = {
          level: 'info',
          timestamps: true
        };
        break;

      default:
        // No specific overrides for unknown environments
        break;
    }

    return overrides;
  }

  /**
   * Merge multiple partial configurations into one
   * 
   * @param configs - Configuration objects to merge (later ones override earlier)
   * @returns Merged configuration
   * 
   * @remarks
   * Performs a deep merge of configuration objects. Later configurations override
   * earlier ones at the field level. Arrays are replaced, not merged.
   */
  private mergeConfigs(...configs: Partial<InfraConfig>[]): Partial<InfraConfig> {
    const result: Partial<InfraConfig> = {};

    for (const config of configs) {
      if (config.aws) {
        result.aws = { ...result.aws, ...config.aws } as AWSConfig;
      }
      if (config.authentik) {
        result.authentik = { ...result.authentik, ...config.authentik } as AuthentikConfig;
      }
      if (config.dashboard) {
        result.dashboard = { ...result.dashboard, ...config.dashboard } as DashboardConfig;
      }
      if (config.api) {
        result.api = { ...result.api, ...config.api } as ApiDeploymentConfig;
      }
      if (config.iac) {
        result.iac = { ...result.iac, ...config.iac } as IACConfig;
      }
      if (config.logging) {
        result.logging = { ...result.logging, ...config.logging } as LoggingConfig;
      }
    }

    return result;
  }

  /**
   * Clear the configuration cache
   * 
   * @remarks
   * Useful for testing or when configuration files change at runtime.
   */
  clearCache(): void {
    this.configCache.clear();
  }
}
