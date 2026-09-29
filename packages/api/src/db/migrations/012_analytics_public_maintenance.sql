-- Migration: 012_analytics_public_maintenance
-- Preserve public share URLs while allowing owners to pause them for maintenance.

ALTER TABLE analytics_sites
  ADD COLUMN public_share_paused BOOLEAN NOT NULL DEFAULT FALSE;
