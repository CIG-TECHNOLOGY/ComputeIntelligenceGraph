ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS contact_email    varchar(255),
  ADD COLUMN IF NOT EXISTS contact_github_url varchar(512);
