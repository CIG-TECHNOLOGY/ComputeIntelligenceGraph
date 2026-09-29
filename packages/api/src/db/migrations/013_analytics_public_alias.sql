-- Migration: 013_analytics_public_alias
-- Stable, human-readable signal-room hostnames under the CIG analytics zones.

ALTER TABLE analytics_sites
  ADD COLUMN public_share_alias TEXT;

ALTER TABLE analytics_sites
  ADD COLUMN public_share_base_domain TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS analytics_sites_public_share_alias_idx
  ON analytics_sites (public_share_base_domain, public_share_alias)
  WHERE public_share_alias IS NOT NULL;
