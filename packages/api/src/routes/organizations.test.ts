import Fastify, { type FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { generateJwt, Permission } from '../auth.js';
import { closeDatabase, query } from '../db/client.js';
import { organizationRoutes } from './organizations.js';

function token(sub: string, email: string) {
  return generateJwt({
    sub,
    email,
    permissions: [Permission.READ_RESOURCES],
  });
}

describe('organization routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'sqlite://:memory:';
    process.env.JWT_SECRET = ['organization', 'route', 'test', 'secret'].join('-');

    await query(`
      CREATE TABLE organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        domain TEXT NOT NULL,
        kind TEXT NOT NULL,
        domain_locked INTEGER NOT NULL DEFAULT 0,
        membership_policy TEXT NOT NULL,
        created_by_user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await query("CREATE UNIQUE INDEX organizations_personal_owner_idx ON organizations (created_by_user_id) WHERE kind = 'personal'");
    await query(`
      CREATE TABLE organization_memberships (
        organization_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (organization_id, user_id)
      )
    `);
    await query(`
      CREATE TABLE organization_invitations (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        email TEXT NOT NULL,
        role TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        invited_by_user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        accepted_at TEXT,
        revoked_at TEXT,
        created_at TEXT NOT NULL
      )
    `);
    await query(`
      CREATE TABLE organization_preferences (
        user_id TEXT PRIMARY KEY,
        active_organization_id TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await query(`
      CREATE TABLE organization_join_links (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        role TEXT NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        created_by_user_id TEXT NOT NULL,
        max_uses INTEGER NOT NULL,
        use_count INTEGER NOT NULL DEFAULT 0,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        created_at TEXT NOT NULL
      )
    `);

    app = Fastify();
    await app.register(organizationRoutes);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await closeDatabase();
  });

  it('provisions one immutable invite-only home organization for a newly registered user', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${token('alice', 'Alice@Acme.Example')}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      activeOrganizationId: expect.any(String),
      items: [{
        name: 'Acme.example',
        domain: 'acme.example',
        kind: 'personal',
        domainLocked: true,
        membershipPolicy: 'invite_only',
        role: 'owner',
      }],
    });
  });

  it('lets an owner create a shared organization and persist an explicit workspace switch', async () => {
    const owner = token('alice', 'alice@acme.example');
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner}` },
      payload: { name: 'Platform team', domain: 'acme.example' },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      organization: {
        name: 'Platform team',
        domain: 'acme.example',
        kind: 'shared',
        domainLocked: false,
        membershipPolicy: 'invite_only',
        role: 'owner',
      },
    });

    const organizationId = created.json().organization.id as string;
    const switched = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/select`,
      headers: { authorization: `Bearer ${owner}` },
    });

    expect(switched.statusCode).toBe(200);
    expect(switched.json()).toMatchObject({ activeOrganizationId: organizationId });
  });

  it('allows owners to send a non-secret email invitation but never exposes its acceptance token', async () => {
    const owner = token('alice', 'alice@acme.example');
    const organizations = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner}` },
    });
    const shared = organizations.json().items.find((item: { kind: string }) => item.kind === 'shared');

    const invitation = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${shared.id}/invitations`,
      headers: { authorization: `Bearer ${owner}` },
      payload: { email: 'member@acme.example', role: 'member' },
    });

    expect(invitation.statusCode).toBe(202);
    expect(invitation.json()).toMatchObject({ invitation: { email: 'member@acme.example', role: 'member', status: 'pending' } });
    expect(invitation.json().invitation).not.toHaveProperty('token');
    expect(invitation.json().invitation).not.toHaveProperty('acceptUrl');
  });

  it('redeems an invitation link only for the invited email address', async () => {
    const owner = token('alice', 'alice@acme.example');
    const organizations = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner}` },
    });
    const shared = organizations.json().items.find((item: { kind: string }) => item.kind === 'shared');
    const invitationToken = 'recipient-bound-invitation-token';
    await query(
      `INSERT INTO organization_invitations (
        id, organization_id, email, role, token_hash, invited_by_user_id, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'oinv-recipient-bound',
        shared.id,
        'member@acme.example',
        'member',
        createHash('sha256').update(invitationToken).digest('hex'),
        'alice',
        new Date(Date.now() + 60_000).toISOString(),
        new Date().toISOString(),
      ],
    );

    const rejected = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/invitations/${invitationToken}/accept`,
      headers: { authorization: `Bearer ${token('outsider', 'outsider@acme.example')}` },
    });
    expect(rejected.statusCode).toBe(403);

    const accepted = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/invitations/${invitationToken}/accept`,
      headers: { authorization: `Bearer ${token('member', 'member@acme.example')}` },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toMatchObject({ organization: { id: shared.id, role: 'member' } });
  });

  it('creates a bounded shared link and admits its holder without disclosing a stored secret', async () => {
    const owner = token('alice', 'alice@acme.example');
    const organizations = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner}` },
    });
    const shared = organizations.json().items.find((item: { kind: string }) => item.kind === 'shared');

    const created = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${shared.id}/join-links`,
      headers: { authorization: `Bearer ${owner}` },
      payload: { role: 'member', maxUses: 1 },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ joinLink: { role: 'member', maxUses: 1, url: expect.stringContaining('/organizations/join/') } });

    const joinToken = created.json().joinLink.url.split('/').pop();
    const joined = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/join-links/${joinToken}/accept`,
      headers: { authorization: `Bearer ${token('linked-member', 'linked-member@outside.example')}` },
    });
    expect(joined.statusCode).toBe(200);
    expect(joined.json()).toMatchObject({ organization: { id: shared.id, role: 'member' } });

    const exhausted = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/join-links/${joinToken}/accept`,
      headers: { authorization: `Bearer ${token('second-member', 'second-member@outside.example')}` },
    });
    expect(exhausted.statusCode).toBe(404);
  });

  it('only lets a shared organization owner enable an explicit same-domain join policy', async () => {
    const owner = token('alice', 'alice@acme.example');
    const organizations = await app.inject({
      method: 'GET',
      url: '/api/v1/organizations',
      headers: { authorization: `Bearer ${owner}` },
    });
    const shared = organizations.json().items.find((item: { kind: string }) => item.kind === 'shared');

    const policy = await app.inject({
      method: 'PATCH',
      url: `/api/v1/organizations/${shared.id}/membership-policy`,
      headers: { authorization: `Bearer ${owner}` },
      payload: { membershipPolicy: 'domain_verified' },
    });
    expect(policy.statusCode).toBe(200);
    expect(policy.json()).toMatchObject({ organization: { id: shared.id, membershipPolicy: 'domain_verified' } });

    const joined = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${shared.id}/join`,
      headers: { authorization: `Bearer ${token('domain-member', 'person@acme.example')}` },
    });
    expect(joined.statusCode).toBe(200);
    expect(joined.json()).toMatchObject({ organization: { id: shared.id, role: 'member' } });

    const personal = organizations.json().items.find((item: { kind: string }) => item.kind === 'personal');
    const blocked = await app.inject({
      method: 'PATCH',
      url: `/api/v1/organizations/${personal.id}/membership-policy`,
      headers: { authorization: `Bearer ${owner}` },
      payload: { membershipPolicy: 'domain_verified' },
    });
    expect(blocked.statusCode).toBe(403);
  });
});
