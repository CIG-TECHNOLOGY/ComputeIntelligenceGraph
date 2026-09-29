import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';

import { query, withTransaction } from '../db/client.js';
import {
  canAcceptEmailInvitation,
  canAutoJoinDomainOrganization,
  createDefaultOrganizationProfile,
  type OrganizationMembershipPolicy,
} from './policy.js';

export type OrganizationKind = 'personal' | 'shared';
export type OrganizationRole = 'owner' | 'admin' | 'member';

export interface OrganizationActor {
  userId: string;
  email: string;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  domain: string;
  kind: OrganizationKind;
  domainLocked: boolean;
  membershipPolicy: OrganizationMembershipPolicy;
  role: OrganizationRole;
}

interface OrganizationRow extends QueryResultRow {
  id: string;
  name: string;
  slug: string;
  domain: string;
  kind: OrganizationKind;
  domain_locked: number | boolean;
  membership_policy: OrganizationMembershipPolicy;
  role: OrganizationRole;
}

interface InvitationRow extends QueryResultRow {
  id: string;
  organization_id: string;
  email: string;
  role: OrganizationRole;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

interface OrganizationSettingsRow extends QueryResultRow {
  id: string;
  name: string;
  domain: string;
  kind: OrganizationKind;
  domain_locked: number | boolean;
  membership_policy: OrganizationMembershipPolicy;
}

interface JoinLinkRow extends QueryResultRow {
  id: string;
  organization_id: string;
  role: OrganizationRole;
  expires_at: string;
  revoked_at: string | null;
  max_uses: number;
  use_count: number;
}

export class OrganizationError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}

function now(): string {
  return new Date().toISOString();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeDomain(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(normalized)) {
    throw new OrganizationError('A valid organization domain is required.', 400);
  }
  return normalized;
}

function normalizeName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length < 2 || normalized.length > 80) {
    throw new OrganizationError('Organization names must be between 2 and 80 characters.', 400);
  }
  return normalized;
}

function createSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'workspace';
  return `${base}-${randomUUID().slice(0, 8)}`;
}

function mapOrganization(row: OrganizationRow): OrganizationSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    domain: row.domain,
    kind: row.kind,
    domainLocked: row.domain_locked === true || Number(row.domain_locked) === 1,
    membershipPolicy: row.membership_policy,
    role: row.role,
  };
}

function isAdmin(role: OrganizationRole): boolean {
  return role === 'owner' || role === 'admin';
}

async function listMemberships(actor: OrganizationActor): Promise<OrganizationSummary[]> {
  const result = await query<OrganizationRow>(
    `SELECT o.id, o.name, o.slug, o.domain, o.kind, o.domain_locked, o.membership_policy, m.role
       FROM organizations o
       JOIN organization_memberships m ON m.organization_id = o.id
      WHERE m.user_id = ?
      ORDER BY CASE o.kind WHEN 'personal' THEN 0 ELSE 1 END, o.created_at ASC`,
    [actor.userId],
  );
  return result.rows.map(mapOrganization);
}

async function ensureHomeOrganization(actor: OrganizationActor): Promise<void> {
  const existing = await query<QueryResultRow>(
    `SELECT id FROM organizations WHERE created_by_user_id = ? AND kind = 'personal' LIMIT 1`,
    [actor.userId],
  );
  if (existing.rows.length > 0) return;

  const profile = createDefaultOrganizationProfile(actor.email);
  const organizationId = `org_${randomUUID()}`;
  const timestamp = now();

  try {
    await withTransaction(async (tx) => {
      await tx(
        `INSERT INTO organizations (
          id, name, slug, domain, kind, domain_locked, membership_policy,
          created_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'personal', 1, ?, ?, ?, ?)`,
        [
          organizationId,
          profile.name,
          `home-${profile.domain.replace(/[^a-z0-9]+/g, '-')}-${randomUUID().slice(0, 8)}`,
          profile.domain,
          profile.membershipPolicy,
          actor.userId,
          timestamp,
          timestamp,
        ],
      );
      await tx(
        `INSERT INTO organization_memberships (organization_id, user_id, email, role, created_at)
         VALUES (?, ?, ?, 'owner', ?)`,
        [organizationId, actor.userId, normalizeEmail(actor.email), timestamp],
      );
    });
  } catch (error) {
    const created = await query<QueryResultRow>(
      `SELECT id FROM organizations WHERE created_by_user_id = ? AND kind = 'personal' LIMIT 1`,
      [actor.userId],
    );
    if (created.rows.length === 0) throw error;
  }
}

async function activeOrganizationId(actor: OrganizationActor, organizations: OrganizationSummary[]): Promise<string> {
  const preference = await query<{ active_organization_id: string }>(
    `SELECT active_organization_id FROM organization_preferences WHERE user_id = ? LIMIT 1`,
    [actor.userId],
  );
  const preferred = preference.rows[0]?.active_organization_id;
  if (preferred && organizations.some((organization) => organization.id === preferred)) return preferred;

  const fallback = organizations[0];
  if (!fallback) throw new OrganizationError('No organization is available for this account.', 500);
  await query(
    `INSERT INTO organization_preferences (user_id, active_organization_id, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET active_organization_id = excluded.active_organization_id, updated_at = excluded.updated_at`,
    [actor.userId, fallback.id, now()],
  );
  return fallback.id;
}

export async function getOrganizationWorkspace(actor: OrganizationActor): Promise<{
  items: OrganizationSummary[];
  activeOrganizationId: string;
}> {
  await ensureHomeOrganization(actor);
  const items = await listMemberships(actor);
  return { items, activeOrganizationId: await activeOrganizationId(actor, items) };
}

export async function createSharedOrganization(
  actor: OrganizationActor,
  input: { name: string; domain: string },
): Promise<OrganizationSummary> {
  const organization: OrganizationSummary = {
    id: `org_${randomUUID()}`,
    name: normalizeName(input.name),
    slug: createSlug(input.name),
    domain: normalizeDomain(input.domain),
    kind: 'shared',
    domainLocked: false,
    membershipPolicy: 'invite_only',
    role: 'owner',
  };
  const timestamp = now();

  await withTransaction(async (tx) => {
    await tx(
      `INSERT INTO organizations (
        id, name, slug, domain, kind, domain_locked, membership_policy,
        created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'shared', 0, 'invite_only', ?, ?, ?)`,
      [organization.id, organization.name, organization.slug, organization.domain, actor.userId, timestamp, timestamp],
    );
    await tx(
      `INSERT INTO organization_memberships (organization_id, user_id, email, role, created_at)
       VALUES (?, ?, ?, 'owner', ?)`,
      [organization.id, actor.userId, normalizeEmail(actor.email), timestamp],
    );
  });

  return organization;
}

export async function selectOrganization(actor: OrganizationActor, organizationId: string): Promise<void> {
  const memberships = await listMemberships(actor);
  if (!memberships.some((organization) => organization.id === organizationId)) {
    throw new OrganizationError('Organization not found.', 404);
  }
  await query(
    `INSERT INTO organization_preferences (user_id, active_organization_id, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET active_organization_id = excluded.active_organization_id, updated_at = excluded.updated_at`,
    [actor.userId, organizationId, now()],
  );
}

async function getMembership(actor: OrganizationActor, organizationId: string): Promise<OrganizationSummary> {
  const result = await query<OrganizationRow>(
    `SELECT o.id, o.name, o.slug, o.domain, o.kind, o.domain_locked, o.membership_policy, m.role
       FROM organizations o
       JOIN organization_memberships m ON m.organization_id = o.id
      WHERE o.id = ? AND m.user_id = ?
      LIMIT 1`,
    [organizationId, actor.userId],
  );
  const membership = result.rows[0];
  if (!membership) throw new OrganizationError('Organization not found.', 404);
  return mapOrganization(membership);
}

async function getOrganizationSettings(organizationId: string): Promise<OrganizationSettingsRow> {
  const result = await query<OrganizationSettingsRow>(
    `SELECT id, name, domain, kind, domain_locked, membership_policy
       FROM organizations WHERE id = ? LIMIT 1`,
    [organizationId],
  );
  const organization = result.rows[0];
  if (!organization) throw new OrganizationError('Organization not found.', 404);
  return organization;
}

export async function updateMembershipPolicy(
  actor: OrganizationActor,
  organizationId: string,
  membershipPolicy: OrganizationMembershipPolicy,
): Promise<OrganizationSummary> {
  if (!['invite_only', 'domain_verified'].includes(membershipPolicy)) {
    throw new OrganizationError('A valid membership policy is required.', 400);
  }
  const membership = await getMembership(actor, organizationId);
  if (membership.role !== 'owner') {
    throw new OrganizationError('Only the organization owner can change its membership policy.', 403);
  }
  if (membership.kind === 'personal' || membership.domainLocked) {
    throw new OrganizationError('The personal home organization policy cannot be changed.', 403);
  }
  await query(
    'UPDATE organizations SET membership_policy = ?, updated_at = ? WHERE id = ?',
    [membershipPolicy, now(), organizationId],
  );
  return getMembership(actor, organizationId);
}

export async function joinDomainOrganization(actor: OrganizationActor, organizationId: string): Promise<OrganizationSummary> {
  const organization = await getOrganizationSettings(organizationId);
  if (!canAutoJoinDomainOrganization({
    verifiedEmail: actor.email,
    organizationDomain: organization.domain,
    membershipPolicy: organization.membership_policy,
  })) {
    throw new OrganizationError('This workspace requires an invitation.', 403);
  }
  await query(
    `INSERT INTO organization_memberships (organization_id, user_id, email, role, created_at)
     VALUES (?, ?, ?, 'member', ?)
     ON CONFLICT(organization_id, user_id) DO NOTHING`,
    [organizationId, actor.userId, normalizeEmail(actor.email), now()],
  );
  return getMembership(actor, organizationId);
}

export async function createOrganizationJoinLink(
  actor: OrganizationActor,
  organizationId: string,
  input: { role: OrganizationRole; maxUses: number },
): Promise<{ id: string; role: OrganizationRole; maxUses: number; expiresAt: string; token: string; organizationName: string }> {
  const organization = await getMembership(actor, organizationId);
  if (!isAdmin(organization.role)) throw new OrganizationError('Only organization owners and admins can create share links.', 403);
  if (input.role !== 'member') throw new OrganizationError('Share links may grant member access only.', 400);
  if (!Number.isInteger(input.maxUses) || input.maxUses < 1 || input.maxUses > 100) {
    throw new OrganizationError('Share links must allow between 1 and 100 uses.', 400);
  }

  const token = randomBytes(32).toString('base64url');
  const link = {
    id: `olink_${randomUUID()}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now(),
  };
  await query(
    `INSERT INTO organization_join_links (
      id, organization_id, role, token_hash, created_by_user_id, max_uses, use_count, expires_at, created_at
    ) VALUES (?, ?, 'member', ?, ?, ?, 0, ?, ?)`,
    [
      link.id,
      organizationId,
      createHash('sha256').update(token).digest('hex'),
      actor.userId,
      input.maxUses,
      link.expiresAt,
      link.createdAt,
    ],
  );
  return { id: link.id, role: 'member', maxUses: input.maxUses, expiresAt: link.expiresAt, token, organizationName: organization.name };
}

export async function acceptOrganizationJoinLink(actor: OrganizationActor, token: string): Promise<OrganizationSummary> {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const result = await query<JoinLinkRow>(
    `SELECT id, organization_id, role, expires_at, revoked_at, max_uses, use_count
       FROM organization_join_links WHERE token_hash = ? LIMIT 1`,
    [tokenHash],
  );
  const link = result.rows[0];
  if (!link || link.revoked_at || new Date(link.expires_at).getTime() <= Date.now() || link.use_count >= link.max_uses) {
    throw new OrganizationError('This share link is invalid or has expired.', 404);
  }

  await withTransaction(async (tx) => {
    const membership = await tx<QueryResultRow>(
      'SELECT user_id FROM organization_memberships WHERE organization_id = ? AND user_id = ? LIMIT 1',
      [link.organization_id, actor.userId],
    );
    if (membership.rows.length > 0) return;

    const claimed = await tx(
      `UPDATE organization_join_links
          SET use_count = use_count + 1
        WHERE id = ? AND revoked_at IS NULL AND expires_at > ? AND use_count < max_uses`,
      [link.id, now()],
    );
    if (claimed.rowCount !== 1) throw new OrganizationError('This share link is invalid or has expired.', 404);
    await tx(
      `INSERT INTO organization_memberships (organization_id, user_id, email, role, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [link.organization_id, actor.userId, normalizeEmail(actor.email), link.role, now()],
    );
  });
  return getMembership(actor, link.organization_id);
}

export async function createEmailInvitation(
  actor: OrganizationActor,
  organizationId: string,
  input: { email: string; role: OrganizationRole },
): Promise<{ id: string; email: string; role: OrganizationRole; status: 'pending'; token: string; organizationName: string }> {
  const organization = await getMembership(actor, organizationId);
  if (!isAdmin(organization.role)) throw new OrganizationError('Only organization owners and admins can invite members.', 403);
  if (!['admin', 'member'].includes(input.role)) throw new OrganizationError('Invitations may grant admin or member access.', 400);

  const email = normalizeEmail(input.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new OrganizationError('A valid invitation email is required.', 400);

  const token = randomBytes(32).toString('base64url');
  const invitation = {
    id: `oinv_${randomUUID()}`,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: now(),
  };
  await query(
    `INSERT INTO organization_invitations (
      id, organization_id, email, role, token_hash, invited_by_user_id, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invitation.id,
      organizationId,
      email,
      input.role,
      createHash('sha256').update(token).digest('hex'),
      actor.userId,
      invitation.expiresAt,
      invitation.createdAt,
    ],
  );

  return { id: invitation.id, email, role: input.role, status: 'pending', token, organizationName: organization.name };
}

export async function acceptEmailInvitation(actor: OrganizationActor, token: string): Promise<OrganizationSummary> {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const result = await query<InvitationRow>(
    `SELECT id, organization_id, email, role, expires_at, accepted_at, revoked_at
       FROM organization_invitations WHERE token_hash = ? LIMIT 1`,
    [tokenHash],
  );
  const invitation = result.rows[0];
  if (!invitation || invitation.revoked_at || invitation.accepted_at || new Date(invitation.expires_at).getTime() <= Date.now()) {
    throw new OrganizationError('This invitation is invalid or has expired.', 404);
  }
  if (!canAcceptEmailInvitation(actor.email, invitation.email)) {
    throw new OrganizationError('This invitation was issued for a different email address.', 403);
  }

  const timestamp = now();
  await withTransaction(async (tx) => {
    await tx(
      `INSERT INTO organization_memberships (organization_id, user_id, email, role, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(organization_id, user_id) DO NOTHING`,
      [invitation.organization_id, actor.userId, normalizeEmail(actor.email), invitation.role, timestamp],
    );
    await tx(`UPDATE organization_invitations SET accepted_at = ? WHERE id = ?`, [timestamp, invitation.id]);
  });

  return getMembership(actor, invitation.organization_id);
}
