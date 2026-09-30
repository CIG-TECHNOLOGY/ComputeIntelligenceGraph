const PRODUCTION_CORS_ORIGINS = [
  'https://cig.technology',
  'https://www.cig.technology',
  'https://app.cig.technology',
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

// Permanent signal rooms are served from one managed, single-label hostname
// under analytics.cig.technology. Keep this intentionally narrow: it allows
// every hostname CIG provisions without opening the API to arbitrary origins
// (or to nested look-alike domains).
export const MANAGED_ANALYTICS_CORS_ORIGIN = /^https:\/\/(?:[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?)\.analytics\.cig\.technology$/i;

type CorsOrigin = string | RegExp;

type CorsEnv = Partial<
  Pick<NodeJS.ProcessEnv, 'CORS_ORIGINS' | 'API_CORS_ORIGINS' | 'CIG_AUTH_MODE' | 'NODE_ENV'>
>;

function parseCorsOriginList(value: string): true | CorsOrigin[] {
  if (value === '*') {
    return true;
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function includeManagedAnalyticsOrigin(env: CorsEnv): boolean {
  return env.NODE_ENV === 'production' && env.CIG_AUTH_MODE !== 'self-hosted';
}

export function resolveCorsOrigins(env: CorsEnv = process.env): true | CorsOrigin[] {
  const configuredOrigins = env.CORS_ORIGINS?.trim() ?? env.API_CORS_ORIGINS?.trim();

  if (configuredOrigins) {
    const parsed = parseCorsOriginList(configuredOrigins);
    if (parsed === true || !includeManagedAnalyticsOrigin(env)) return parsed;
    return [...parsed, MANAGED_ANALYTICS_CORS_ORIGIN];
  }

  if (env.CIG_AUTH_MODE === 'self-hosted') {
    return [...SELF_HOSTED_LOCAL_CORS_ORIGINS];
  }

  if (env.NODE_ENV !== 'production') {
    return true;
  }

  return includeManagedAnalyticsOrigin(env)
    ? [...PRODUCTION_CORS_ORIGINS, MANAGED_ANALYTICS_CORS_ORIGIN]
    : [...PRODUCTION_CORS_ORIGINS];
}
