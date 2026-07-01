const PRODUCTION_CORS_ORIGINS = [
  'https://cig.lat',
  'https://www.cig.lat',
  'https://app.cig.lat',
  'https://cig-technology.github.io',
];

const SELF_HOSTED_LOCAL_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

type CorsEnv = Partial<
  Pick<NodeJS.ProcessEnv, 'CORS_ORIGINS' | 'API_CORS_ORIGINS' | 'CIG_AUTH_MODE' | 'NODE_ENV'>
>;

function parseCorsOriginList(value: string): true | string[] {
  if (value === '*') {
    return true;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function resolveCorsOrigins(env: CorsEnv = process.env): true | string[] {
  const configuredOrigins = env.CORS_ORIGINS?.trim() ?? env.API_CORS_ORIGINS?.trim();

  if (configuredOrigins) {
    return parseCorsOriginList(configuredOrigins);
  }

  if (env.CIG_AUTH_MODE === 'self-hosted') {
    return [...SELF_HOSTED_LOCAL_CORS_ORIGINS];
  }

  if (env.NODE_ENV !== 'production') {
    return true;
  }

  return [...PRODUCTION_CORS_ORIGINS];
}
