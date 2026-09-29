-- Migration: 011_organizations
-- Canonical organization control plane shared by all dashboard products.

CREATE TABLE IF NOT EXISTS organizations (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  domain              TEXT NOT NULL,
  kind                TEXT NOT NULL CHECK (kind IN ('personal', 'shared')),
  domain_locked       BOOLEAN NOT NULL DEFAULT FALSE,
  membership_policy   TEXT NOT NULL DEFAULT 'invite_only'
                        CHECK (membership_policy IN ('invite_only', 'domain_verified')),
  created_by_user_id  TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every account has exactly one personal home organization. Shared organizations
-- are intentionally not constrained by creator, allowing one user to own many.
CREATE UNIQUE INDEX IF NOT EXISTS organizations_personal_owner_idx
  ON organizations (created_by_user_id)
  WHERE kind = 'personal';
CREATE INDEX IF NOT EXISTS organizations_domain_idx ON organizations (domain);

CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_id  TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL,
  email            TEXT NOT NULL,
  role             TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS organization_memberships_user_idx
  ON organization_memberships (user_id);
CREATE INDEX IF NOT EXISTS organization_memberships_email_idx
  ON organization_memberships (email);

CREATE TABLE IF NOT EXISTS organization_invitations (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  role                TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  token_hash          TEXT NOT NULL UNIQUE,
  invited_by_user_id  TEXT NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  accepted_at         TIMESTAMPTZ,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organization_invitations_org_email_idx
  ON organization_invitations (organization_id, email);

-- Share links grant the least-privileged role only, are time-bounded, and
-- store only a hash. The raw token is returned once to the creating admin.
CREATE TABLE IF NOT EXISTS organization_join_links (
  id                  TEXT PRIMARY KEY,
  organization_id     TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role                TEXT NOT NULL CHECK (role = 'member'),
  token_hash          TEXT NOT NULL UNIQUE,
  created_by_user_id  TEXT NOT NULL,
  max_uses            INTEGER NOT NULL CHECK (max_uses BETWEEN 1 AND 100),
  use_count           INTEGER NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS organization_join_links_org_idx
  ON organization_join_links (organization_id);

CREATE TABLE IF NOT EXISTS organization_preferences (
  user_id                 TEXT PRIMARY KEY,
  active_organization_id  TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
