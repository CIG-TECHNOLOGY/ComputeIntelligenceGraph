/**
 * Workspace env manifest for @edcalderon/versioning workspace-env extension.
 * Defines canonical variables and how they map to each package's .env.example / .env.local.
 */

/** @type {import('@edcalderon/versioning').WorkspaceEnvManifest} */
module.exports = {
  sources: ['.env', '.env.local'],
  rootExampleFile: '.env.example',

  variables: {
    // ── Internal services ──────────────────────────────────────────────────
    API_URL: {
      description: 'Internal API URL for agent packages',
      example: 'http://localhost:8080',
      targets: { agents: 'API_URL' },
    },
    CARTOGRAPHY_URL: {
      description: 'Cartography service URL',
      example: 'http://localhost:8001',
      targets: { api: 'CARTOGRAPHY_URL', discovery: 'CARTOGRAPHY_URL' },
    },
    CHROMA_URL: {
      description: 'Chroma vector database URL',
      example: 'http://localhost:8000',
      targets: { api: 'CHROMA_URL', agents: 'CHROMA_URL', chatbot: 'CHROMA_URL' },
    },
    CORS_ORIGINS: {
      description: 'Comma-separated allowed origins for the API',
      example: 'http://localhost:3000,http://localhost:3001',
      targets: { api: 'CORS_ORIGINS' },
    },
    HOST: {
      description: 'API host binding',
      example: '0.0.0.0',
      targets: { api: 'HOST' },
    },
    PORT: {
      description: 'API port',
      example: '8080',
      targets: { api: 'PORT' },
    },

    // ── Analytics / Umami ─────────────────────────────────────────────────
    ANALYTICS_PROVISIONING_MODE: {
      description: 'Analytics website provisioning mode (local rehearsal or upstream Umami)',
      example: 'local',
      targets: { api: 'ANALYTICS_PROVISIONING_MODE', infra: 'ANALYTICS_PROVISIONING_MODE' },
    },
    UMAMI_API_URL: {
      description: 'Private Umami API base URL used by the control plane',
      example: 'http://localhost:3000',
      targets: { api: 'UMAMI_API_URL', infra: 'UMAMI_API_URL' },
    },
    UMAMI_API_TOKEN: {
      description: 'Umami API token used only by the server-side provisioner',
      example: '<YOUR_UMAMI_API_TOKEN>',
      secret: true,
      targets: { api: 'UMAMI_API_TOKEN' },
    },
    ANALYTICS_COLLECTOR_URL: {
      description: 'Public CIG analytics collection endpoint injected into the tracker',
      example: 'http://localhost:8080/api/v1/analytics/collect',
      targets: { api: 'ANALYTICS_COLLECTOR_URL', infra: 'ANALYTICS_COLLECTOR_URL' },
    },
    UMAMI_TEAM_ID: {
      description: 'Optional Umami team identifier for provisioned websites',
      example: '',
      targets: { api: 'UMAMI_TEAM_ID', infra: 'UMAMI_TEAM_ID' },
    },
    API_UMAMI_API_TOKEN_SECRET_ARN: {
      description: 'AWS Secrets Manager ARN containing the server-side Umami API token',
      example: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:cig/prod/umami/provisioner-token',
      targets: { infra: 'API_UMAMI_API_TOKEN_SECRET_ARN' },
    },
    API_ASSIGN_PUBLIC_IP: {
      description: 'Assign public IPs to API tasks when the private egress path is unavailable',
      example: 'false',
      targets: { infra: 'API_ASSIGN_PUBLIC_IP' },
    },

    // ── Neo4j ──────────────────────────────────────────────────────────────
    NEO4J_URI: {
      description: 'Neo4j connection URI',
      example: 'bolt://localhost:7687',
      targets: { api: 'NEO4J_URI', graph: 'NEO4J_URI' },
    },
    NEO4J_USER: {
      description: 'Neo4j username',
      example: 'neo4j',
      targets: { api: 'NEO4J_USER', graph: 'NEO4J_USER' },
    },
    NEO4J_PASSWORD: {
      description: 'Neo4j password',
      example: 'neo4j',
      secret: true,
      targets: { api: 'NEO4J_PASSWORD', graph: 'NEO4J_PASSWORD' },
    },
    NEO4J_DATABASE: {
      description: 'Neo4j database name',
      example: 'neo4j',
      targets: { api: 'NEO4J_DATABASE', graph: 'NEO4J_DATABASE' },
    },

    // ── Auth / JWT ─────────────────────────────────────────────────────────
    JWT_SECRET: {
      description: 'JWT signing secret',
      example: '<YOUR_JWT_SECRET>',
      secret: true,
      targets: { api: 'JWT_SECRET' },
    },
    AUTHENTIK_TOKEN_ENDPOINT: {
      description: 'Authentik OIDC Token Endpoint',
      example: 'https://<YOUR_AUTHENTIK_DOMAIN>/application/o/token/',
      targets: { api: 'AUTHENTIK_TOKEN_ENDPOINT' },
    },
    AUTHENTIK_JWKS_URI: {
      description: 'Authentik OIDC JWKS Endpoint',
      example: 'https://<YOUR_AUTHENTIK_DOMAIN>/application/o/cig/jwks/',
      targets: { api: 'AUTHENTIK_JWKS_URI' },
    },
    OIDC_CLIENT_ID: {
      description: 'OIDC Client ID for Authentik',
      example: '<YOUR_CLIENT_ID>',
      targets: { api: 'OIDC_CLIENT_ID' },
    },
    OIDC_CLIENT_SECRET: {
      description: 'OIDC Client Secret for Authentik',
      example: '<YOUR_CLIENT_SECRET>',
      secret: true,
      targets: { api: 'OIDC_CLIENT_SECRET' },
    },
    OIDC_REDIRECT_URI: {
      description: 'OIDC Redirect URI for local callback',
      example: 'http://localhost:8080/api/v1/auth/oidc/callback',
      targets: { api: 'OIDC_REDIRECT_URI' },
    },

    // ── Supabase ───────────────────────────────────────────────────────────
    SUPABASE_URL: {
      description: 'Canonical Supabase URL for frontend consumers',
      example: 'https://<YOUR_PROJECT>.supabase.co',
      targets: {
        landing: 'NEXT_PUBLIC_SUPABASE_URL',
        dashboard: 'NEXT_PUBLIC_SUPABASE_URL',
      },
    },
    SUPABASE_ANON_KEY: {
      description: 'Canonical Supabase anon key for frontend consumers',
      example: '<YOUR_SUPABASE_ANON_KEY>',
      secret: true,
      targets: {
        landing: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        dashboard: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      },
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      description: 'Supabase service role key',
      example: '<YOUR_SUPABASE_SERVICE_ROLE_KEY>',
      secret: true,
      targets: {
        api: 'SUPABASE_SERVICE_ROLE_KEY',
        dashboard: 'SUPABASE_SERVICE_ROLE_KEY',
      },
    },
    SUPABASE_DIRECT_URL: {
      description: 'Direct database connection string',
      example: 'postgresql://postgres:postgres@localhost:5432/postgres',
      secret: true,
      targets: {},
    },
    SUPABASE_DIRECT_URL_MIGRATIONS: {
      description: 'Direct database connection string used for migrations',
      example: 'postgresql://postgres:postgres@localhost:5432/postgres',
      secret: true,
      targets: {},
    },
    SUPABASE_DIRECT_URL_POOLER: {
      description: 'IPv4-only pooler connection string (avoids ENETUNREACH on IPv6-unreachable networks)',
      example: 'postgresql://postgres.ref:password@aws-0-us-west-2.pooler.supabase.com:5432/postgres',
      secret: true,
      targets: {},
    },

    // ── AI / LLM ───────────────────────────────────────────────────────────
    OPENAI_API_KEY: {
      description: 'OpenAI API key',
      example: '<YOUR_OPENAI_API_KEY>',
      secret: true,
      targets: { api: 'OPENAI_API_KEY', agents: 'OPENAI_API_KEY', chatbot: 'OPENAI_API_KEY' },
    },
    OPENAI_CHAT_MODEL: {
      description: 'OpenAI chat model for infrastructure responses and image summaries',
      example: 'gpt-4o-mini',
      targets: { api: 'OPENAI_CHAT_MODEL' },
    },
    OPENAI_TRANSCRIPTION_MODEL: {
      description: 'OpenAI transcription model used for voice-to-text chat input',
      example: 'whisper-1',
      targets: { api: 'OPENAI_TRANSCRIPTION_MODEL' },
    },
    CHAT_UPLOAD_MAX_BYTES: {
      description: 'Maximum attachment upload size per file in bytes',
      example: '10485760',
      targets: { api: 'CHAT_UPLOAD_MAX_BYTES' },
    },
    CHAT_AUDIO_MAX_SECONDS: {
      description: 'Maximum voice recording length per transcription request in seconds',
      example: '120',
      targets: { api: 'CHAT_AUDIO_MAX_SECONDS' },
    },
    API_OPENAI_API_KEY_SECRET_ARN: {
      description: 'AWS Secrets Manager ARN for the API OpenAI key',
      example: 'arn:aws:secretsmanager:us-east-2:123456789012:secret:cig/api/openai',
      targets: { infra: 'API_OPENAI_API_KEY_SECRET_ARN' },
    },

    // ── Discovery ──────────────────────────────────────────────────────────
    DISCOVERY_INTERVAL_MINUTES: {
      description: 'Discovery interval in minutes',
      example: '5',
      targets: { api: 'DISCOVERY_INTERVAL_MINUTES', discovery: 'DISCOVERY_INTERVAL_MINUTES' },
    },
    DISCOVERY_INTERVAL_MS: {
      description: 'Discovery interval in milliseconds',
      example: '300000',
      targets: { api: 'DISCOVERY_INTERVAL_MS', discovery: 'DISCOVERY_INTERVAL_MS' },
    },

    // ── Logging ────────────────────────────────────────────────────────────
    LOG_LEVEL: {
      description: 'Application log level',
      example: 'info',
      targets: { api: 'LOG_LEVEL', infra: 'LOG_LEVEL' },
    },
    LOG_TIMESTAMPS: {
      description: 'Whether structured logs include timestamps',
      example: 'true',
      targets: { infra: 'LOG_TIMESTAMPS' },
    },

    // ── Frontend / Public URLs ─────────────────────────────────────────────
    NEXT_PUBLIC_SITE_URL: {
      description: 'Primary public site URL',
      example: 'https://cig.technology',
      targets: { landing: 'NEXT_PUBLIC_SITE_URL', dashboard: 'NEXT_PUBLIC_SITE_URL' },
    },
    NEXT_PUBLIC_LEGACY_SITE_URL: {
      description: 'Legacy public site URL',
      example: 'https://cig-technology.github.io/ComputeIntelligenceGraph',
      targets: { landing: 'NEXT_PUBLIC_LEGACY_SITE_URL' },
    },
    NEXT_PUBLIC_API_URL: {
      description: 'Public API URL for browser apps',
      example: 'http://localhost:8080',
      targets: { dashboard: 'NEXT_PUBLIC_API_URL' },
    },
    NEXT_PUBLIC_DASHBOARD_URL: {
      description: 'Dashboard URL — where to redirect after a successful sign-in',
      example: 'http://localhost:3001',
      targets: { landing: 'NEXT_PUBLIC_DASHBOARD_URL' },
    },
    LEGACY_BASEPATH: {
      description: 'Enable the legacy GitHub Pages base path',
      example: 'false',
      targets: { landing: 'LEGACY_BASEPATH' },
    },

    // ── AWS ────────────────────────────────────────────────────────────────
    AWS_ACCOUNT_ID: {
      description: 'AWS account ID',
      example: '123456789012',
      targets: { infra: 'AWS_ACCOUNT_ID' },
    },
    AWS_REGION: {
      description: 'AWS region',
      example: 'us-east-2',
      targets: { infra: 'AWS_REGION' },
    },
    AWS_PROFILE: {
      description: 'AWS CLI profile',
      example: 'default',
      targets: { infra: 'AWS_PROFILE' },
    },
    AWS_ROLE_ARN: {
      description: 'AWS role ARN',
      example: 'arn:aws:iam::123456789012:role/cig',
      targets: { infra: 'AWS_ROLE_ARN' },
    },

    // ── GCP ────────────────────────────────────────────────────────────────
    GCP_PROJECT: {
      description: 'GCP project ID',
      example: 'your-gcp-project',
      targets: {},
    },

    // ── Google OAuth ───────────────────────────────────────────────────────
    GOOGLE_AUTH_CLIENT_ID: {
      description: 'Google OAuth client ID',
      example: '<YOUR_GOOGLE_CLIENT_ID>.apps.googleusercontent.com',
      targets: {},
    },
    GOOGLE_AUTH_CLIENT_SECRET: {
      description: 'Google OAuth client secret',
      example: '<YOUR_GOOGLE_CLIENT_SECRET>',
      secret: true,
      targets: {},
    },

    // ── Authentik ──────────────────────────────────────────────────────────
    AUTHENTIK_DOMAIN: {
      description: 'Authentik domain',
      example: '<YOUR_AUTHENTIK_DOMAIN>',
      targets: { infra: 'AUTHENTIK_DOMAIN' },
    },
    AUTHENTIK_ADMIN_EMAIL: {
      description: 'Authentik admin email',
      example: '<YOUR_AUTHENTIK_ADMIN_EMAIL>',
      targets: { infra: 'AUTHENTIK_ADMIN_EMAIL' },
    },
    AUTHENTIK_TOKEN_ENDPOINT: {
      description: 'Authentik OIDC token endpoint',
      example: 'https://auth.example.com/application/o/token/',
      targets: { api: 'AUTHENTIK_TOKEN_ENDPOINT' },
    },
    AUTHENTIK_JWKS_URI: {
      description: 'Authentik JWKS endpoint for ID token signature verification',
      example: 'https://auth.example.com/application/o/cig/jwks/',
      targets: { api: 'AUTHENTIK_JWKS_URI' },
    },
    AUTHENTIK_ISSUER_URL: {
      description: 'Authentik OIDC issuer URL',
      example: 'https://auth.example.com/application/o/cig/',
      targets: { api: 'AUTHENTIK_ISSUER_URL' },
    },
    OIDC_CLIENT_ID: {
      description: 'OIDC client ID registered in Authentik',
      example: 'your-oidc-client-id',
      targets: { api: 'OIDC_CLIENT_ID' },
    },
    OIDC_CLIENT_SECRET: {
      description: 'OIDC client secret',
      example: 'your-oidc-client-secret',
      secret: true,
      targets: { api: 'OIDC_CLIENT_SECRET' },
    },
    OIDC_REDIRECT_URI: {
      description: 'OIDC redirect URI for the API callback',
      example: 'http://localhost:8080/api/v1/auth/oidc/callback',
      targets: { api: 'OIDC_REDIRECT_URI' },
    },
    AUTHENTIK_SUBNET_ID: {
      description: 'Authentik subnet ID',
      example: 'subnet-1234567890',
      targets: { infra: 'AUTHENTIK_SUBNET_ID' },
    },
    AUTHENTIK_VPC_ID: {
      description: 'Authentik VPC ID',
      example: 'vpc-1234567890',
      targets: { infra: 'AUTHENTIK_VPC_ID' },
    },

    // ── IaC ────────────────────────────────────────────────────────────────
    IAC_MODULES_PATH: {
      description: 'Terraform modules base path',
      example: './packages/iac/modules',
      targets: { infra: 'IAC_MODULES_PATH' },
    },
    IAC_COMPUTE_MODULE: {
      description: 'Compute module name',
      example: 'compute',
      targets: { infra: 'IAC_COMPUTE_MODULE' },
    },
    IAC_NETWORKING_MODULE: {
      description: 'Networking module name',
      example: 'networking',
      targets: { infra: 'IAC_NETWORKING_MODULE' },
    },

    // ── Dashboard config ───────────────────────────────────────────────────
    DASHBOARD_DOMAIN: {
      description: 'Dashboard domain',
      example: 'dashboard.example.com',
      targets: { infra: 'DASHBOARD_DOMAIN' },
    },
    DASHBOARD_BUILD_PATH: {
      description: 'Dashboard build output path',
      example: './apps/dashboard/out',
      targets: { infra: 'DASHBOARD_BUILD_PATH' },
    },
    DASHBOARD_AUTHENTIK_INTEGRATION: {
      description: 'Whether dashboard integrates with Authentik',
      example: 'true',
      targets: { infra: 'DASHBOARD_AUTHENTIK_INTEGRATION' },
    },
  },

  targets: {
    landing: {
      description: 'apps/landing Next.js app',
      path: 'apps/landing',
      envFile: '.env.local',
      exampleFile: '.env.example',
    },
    dashboard: {
      description: 'apps/dashboard Next.js app',
      path: 'apps/dashboard',
      envFile: '.env.local',
      exampleFile: '.env.example',
    },
    api: {
      description: 'packages/api Express server',
      path: 'packages/api',
      envFile: '.env',
      exampleFile: '.env.example',
    },
    agents: {
      description: 'packages/agents LangChain agents',
      path: 'packages/agents',
      envFile: '.env',
      exampleFile: '.env.example',
    },
    chatbot: {
      description: 'packages/chatbot RAG chatbot',
      path: 'packages/chatbot',
      envFile: '.env',
      exampleFile: '.env.example',
    },
    discovery: {
      description: 'packages/discovery asset discovery',
      path: 'packages/discovery',
      envFile: '.env',
      exampleFile: '.env.example',
    },
    graph: {
      description: 'packages/graph Neo4j graph layer',
      path: 'packages/graph',
      envFile: '.env',
      exampleFile: '.env.example',
    },
    infra: {
      description: 'packages/infra SST app',
      path: 'packages/infra',
      envFile: '.env.local',
      exampleFile: 'examples/.env.example',
    },
  },
};
