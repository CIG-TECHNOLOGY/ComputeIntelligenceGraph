const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}(?::\d{1,5})?$|^localhost(?::\d{1,5})?$/i;

export const ANALYTICS_PUBLIC_BASE_DOMAINS = ['analytics.cig.technology'] as const;
export type AnalyticsPublicBaseDomain = (typeof ANALYTICS_PUBLIC_BASE_DOMAINS)[number];
const ANALYTICS_PUBLIC_ALIAS_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?$/i;

export interface SiteInput {
  name: string;
  domain: string;
}

export type SiteValidationResult =
  | { valid: true; name: string; domain: string }
  | { valid: false; field: 'name' | 'domain'; message: string };

export function normalizeDomain(value: string): string {
  const trimmed = value.trim();
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    const host = url.host.toLowerCase().replace(/\.$/, '');
    return host;
  } catch {
    return trimmed.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
  }
}

export function validateSiteInput(input: SiteInput): SiteValidationResult {
  const name = input.name.trim();
  const domain = normalizeDomain(input.domain);

  if (!name || name.length > 120) {
    return { valid: false, field: 'name', message: 'Site name must be between 1 and 120 characters' };
  }

  if (!DOMAIN_PATTERN.test(domain)) {
    return { valid: false, field: 'domain', message: 'Enter a valid hostname such as example.com' };
  }

  return { valid: true, name, domain };
}

export function isAllowedOrigin(origin: string | undefined, configuredDomain: string): boolean {
  if (!origin || origin === 'null') {
    return false;
  }

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    return parsed.host.toLowerCase() === normalizeDomain(configuredDomain);
  } catch {
    return false;
  }
}

/**
 * Public signal-room aliases deliberately represent exactly one DNS label.
 * Dots are rejected so an owner cannot escape the managed analytics zone.
 */
export function validateAnalyticsPublicAlias(
  alias: string,
  baseDomain: string,
): { valid: true; alias: string; baseDomain: AnalyticsPublicBaseDomain } | { valid: false; field: 'alias' | 'baseDomain'; message: string } {
  const normalizedAlias = alias.trim().toLowerCase();
  const normalizedBase = baseDomain.trim().toLowerCase();
  if (!ANALYTICS_PUBLIC_ALIAS_PATTERN.test(normalizedAlias)) {
    return { valid: false, field: 'alias', message: 'Use one DNS label (1–63 letters, numbers, hyphens, or underscores) without dots.' };
  }
  if (!ANALYTICS_PUBLIC_BASE_DOMAINS.includes(normalizedBase as AnalyticsPublicBaseDomain)) {
    return { valid: false, field: 'baseDomain', message: 'Choose analytics.cig.technology.' };
  }
  return { valid: true, alias: normalizedAlias, baseDomain: normalizedBase as AnalyticsPublicBaseDomain };
}

export function analyticsPublicAliasUrl(alias: string, baseDomain: AnalyticsPublicBaseDomain): string {
  return `https://${alias}.${baseDomain}`;
}

export interface TrackerScriptOptions {
  siteId: string;
  collectorUrl: string;
}

/**
 * The browser-visible tracker intentionally contains only the control-plane
 * site id. The collector resolves that id to the private Umami website id.
 */
export function buildTrackerScript({ siteId, collectorUrl }: TrackerScriptOptions): string {
  const publicSiteId = JSON.stringify(siteId);
  const endpoint = JSON.stringify(collectorUrl);

  return `/* CIG Analytics tracker v1 */
(function () {
  'use strict';
  var site = ${publicSiteId};
  var endpoint = ${endpoint};
  function send(payload) {
    var body = JSON.stringify({ site: site, payload: payload });
    if (navigator.sendBeacon) {
      var accepted = navigator.sendBeacon(endpoint, new Blob([body], { type: 'text/plain' }));
      if (accepted) return;
    }
    fetch(endpoint, { method: 'POST', body: body, headers: { 'content-type': 'text/plain;charset=UTF-8' }, keepalive: true, credentials: 'omit' }).catch(function () {});
  }
  function pageview() {
    send({ type: 'pageview', url: location.href, title: document.title, referrer: document.referrer || undefined });
  }
  window.cigAnalytics = window.cigAnalytics || { track: function (name, data) { send({ type: 'event', name: String(name).slice(0, 120), data: data || {} }); } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pageview, { once: true }); else pageview();
  window.addEventListener('cig-track', function (event) { var detail = event && event.detail || {}; if (detail.name) window.cigAnalytics.track(detail.name, detail.data); });
})();
`;
}
