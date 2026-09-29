-- Migration: 009_analytics_saas
-- Control-plane tenancy and server-side public-site to Umami mappings.

CREATE TABLE IF NOT EXISTS analytics_organizations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  plan        TEXT NOT NULL DEFAULT 'free',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_memberships (
  organization_id TEXT NOT NULL,
  user_id         TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'owner'
                    CHECK (role IN ('owner', 'admin', 'member')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS analytics_memberships_user_idx
  ON analytics_memberships (user_id);

CREATE TABLE IF NOT EXISTS analytics_sites (
  id                TEXT PRIMARY KEY,
  organization_id   TEXT NOT NULL,
  name              TEXT NOT NULL,
  domain            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'provisioning', 'active', 'failed', 'deleting', 'deleted')),
  umami_website_id  TEXT,
  last_error_code   TEXT,
  idempotency_key   TEXT,
  last_event_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS analytics_sites_org_domain_idx
  ON analytics_sites (organization_id, domain);
CREATE UNIQUE INDEX IF NOT EXISTS analytics_sites_org_idempotency_idx
  ON analytics_sites (organization_id, idempotency_key);
CREATE INDEX IF NOT EXISTS analytics_sites_org_status_idx
  ON analytics_sites (organization_id, status);

CREATE TABLE IF NOT EXISTS analytics_usage_daily (
  organization_id TEXT NOT NULL,
  site_id         TEXT NOT NULL,
  usage_date      TEXT NOT NULL,
  pageviews       INTEGER NOT NULL DEFAULT 0,
  events          INTEGER NOT NULL DEFAULT 0,
  accepted        INTEGER NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (site_id, usage_date)
);

CREATE INDEX IF NOT EXISTS analytics_usage_org_date_idx
  ON analytics_usage_daily (organization_id, usage_date);

CREATE TABLE IF NOT EXISTS analytics_audit_events (
  id              TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  site_id         TEXT,
  actor_user_id   TEXT NOT NULL,
  action          TEXT NOT NULL,
  outcome         TEXT NOT NULL CHECK (outcome IN ('success', 'failure')),
  metadata_json   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_audit_org_created_idx
  ON analytics_audit_events (organization_id, created_at DESC);
