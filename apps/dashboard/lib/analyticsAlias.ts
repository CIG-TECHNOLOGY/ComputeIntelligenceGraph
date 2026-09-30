const PERMANENT_ANALYTICS_HOST_PATTERN = /^([a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?)\.analytics\.cig\.technology$/i;

/**
 * Return the canonical alias encoded in a managed analytics hostname.
 * Permanent links intentionally accept exactly one DNS label so a hostname
 * cannot escape the managed zone or be interpreted as another dashboard route.
 */
export function getPermanentAnalyticsAlias(hostname: string): string | null {
  const normalized = hostname.trim().toLowerCase().replace(/:\d+$/, "");
  return PERMANENT_ANALYTICS_HOST_PATTERN.exec(normalized)?.[1] ?? null;
}

export function canSubmitPermanentAlias({
  publicAccessEnabled,
  aliasValid,
  mutationPending,
}: {
  publicAccessEnabled: boolean;
  aliasValid: boolean;
  mutationPending: boolean;
}): boolean {
  return publicAccessEnabled && aliasValid && !mutationPending;
}
