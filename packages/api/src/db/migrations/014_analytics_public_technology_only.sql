-- Migration: 014_analytics_public_technology_only
-- Retire aliases in the unsupported cig.lat zone so they can be recreated
-- under the managed analytics.cig.technology zone.

UPDATE analytics_sites
SET public_share_alias = NULL,
    public_share_base_domain = NULL
WHERE public_share_alias IS NOT NULL
  AND (public_share_base_domain IS NULL OR public_share_base_domain <> 'analytics.cig.technology');
