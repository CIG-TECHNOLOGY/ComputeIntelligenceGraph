-- Migration: 010_analytics_public_access
-- Rotatable, read-only share links for the CIG-owned analytics dashboard.

ALTER TABLE analytics_sites
  ADD COLUMN public_share_token_hash TEXT;

ALTER TABLE analytics_sites
  ADD COLUMN public_share_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE analytics_sites
  ADD COLUMN public_share_created_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS analytics_sites_public_share_hash_idx
  ON analytics_sites (public_share_token_hash);
