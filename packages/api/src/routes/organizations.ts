import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { authenticate, type JwtPayload } from '../auth.js';
import type { OrganizationMembershipPolicy } from '../organizations/policy.js';
import {
  acceptEmailInvitation,
  acceptOrganizationJoinLink,
  createEmailInvitation,
  createOrganizationJoinLink,
  createSharedOrganization,
  getOrganizationWorkspace,
  joinDomainOrganization,
  OrganizationError,
  selectOrganization,
  type OrganizationActor,
  type OrganizationRole,
  updateMembershipPolicy,
} from '../organizations/service.js';

function actorFrom(request: FastifyRequest, reply: FastifyReply): OrganizationActor | null {
  const user = (request as FastifyRequest & { user?: JwtPayload }).user;
  const email = user?.email?.trim();
  if (!user?.sub || !email) {
    reply.status(403).send({ error: 'A verified account email is required for organization access.', statusCode: 403 });
    return null;
  }
  return { userId: user.sub, email };
}

function sendError(reply: FastifyReply, error: unknown) {
  if (error instanceof OrganizationError) {
    return reply.status(error.statusCode).send({ error: error.message, statusCode: error.statusCode });
  }
  return reply.status(500).send({ error: 'Unable to complete the organization request.', statusCode: 500 });
}

async function sendInvitationEmail(options: { email: string; organizationName: string; token: string }): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) return;

  const nodemailer = await import('nodemailer');
  const dashboardUrl = (process.env.DASHBOARD_URL ?? process.env.SITE_URL ?? 'https://app.cig.technology').replace(/\/$/, '');
  const acceptUrl = `${dashboardUrl}/organizations/invitations/${encodeURIComponent(options.token)}`;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: options.email,
    subject: `You were invited to ${options.organizationName} on CIG`,
    text: `Join ${options.organizationName}: ${acceptUrl}\n\nThis invitation expires in 7 days.`,
  });
}

export async function organizationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/organizations', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = actorFrom(request, reply);
    if (!actor) return;
    try {
      return reply.send(await getOrganizationWorkspace(actor));
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/v1/organizations', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = actorFrom(request, reply);
    if (!actor) return;
    const body = (request.body ?? {}) as { name?: string; domain?: string };
    try {
      const organization = await createSharedOrganization(actor, { name: body.name ?? '', domain: body.domain ?? '' });
      return reply.status(201).send({ organization });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/v1/organizations/:organizationId/select', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = actorFrom(request, reply);
    if (!actor) return;
    const { organizationId } = request.params as { organizationId: string };
    try {
      await selectOrganization(actor, organizationId);
      return reply.send({ activeOrganizationId: organizationId });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/v1/organizations/:organizationId/invitations', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = actorFrom(request, reply);
    if (!actor) return;
    const { organizationId } = request.params as { organizationId: string };
    const body = (request.body ?? {}) as { email?: string; role?: OrganizationRole };
    try {
      const invitation = await createEmailInvitation(actor, organizationId, {
        email: body.email ?? '',
        role: body.role ?? 'member',
      });
      await sendInvitationEmail(invitation);
      return reply.status(202).send({
        invitation: { id: invitation.id, email: invitation.email, role: invitation.role, status: invitation.status },
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.patch('/api/v1/organizations/:organizationId/membership-policy', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = actorFrom(request, reply);
    if (!actor) return;
    const { organizationId } = request.params as { organizationId: string };
    const body = (request.body ?? {}) as { membershipPolicy?: OrganizationMembershipPolicy };
    try {
      return reply.send({ organization: await updateMembershipPolicy(actor, organizationId, body.membershipPolicy ?? 'invite_only') });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/v1/organizations/:organizationId/join', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = actorFrom(request, reply);
    if (!actor) return;
    const { organizationId } = request.params as { organizationId: string };
    try {
      return reply.send({ organization: await joinDomainOrganization(actor, organizationId) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/v1/organizations/:organizationId/join-links', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = actorFrom(request, reply);
    if (!actor) return;
    const { organizationId } = request.params as { organizationId: string };
    const body = (request.body ?? {}) as { role?: OrganizationRole; maxUses?: number };
    try {
      const joinLink = await createOrganizationJoinLink(actor, organizationId, {
        role: body.role ?? 'member',
        maxUses: body.maxUses ?? 10,
      });
      const dashboardUrl = (process.env.DASHBOARD_URL ?? process.env.SITE_URL ?? 'https://app.cig.technology').replace(/\/$/, '');
      return reply.status(201).send({
        joinLink: {
          id: joinLink.id,
          role: joinLink.role,
          maxUses: joinLink.maxUses,
          expiresAt: joinLink.expiresAt,
          url: `${dashboardUrl}/organizations/join/${encodeURIComponent(joinLink.token)}`,
        },
      });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/v1/organizations/join-links/:token/accept', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = actorFrom(request, reply);
    if (!actor) return;
    const { token } = request.params as { token: string };
    try {
      return reply.send({ organization: await acceptOrganizationJoinLink(actor, token) });
    } catch (error) {
      return sendError(reply, error);
    }
  });

  app.post('/api/v1/organizations/invitations/:token/accept', { preHandler: [authenticate] }, async (request, reply) => {
    const actor = actorFrom(request, reply);
    if (!actor) return;
    const { token } = request.params as { token: string };
    try {
      return reply.send({ organization: await acceptEmailInvitation(actor, token) });
    } catch (error) {
      return sendError(reply, error);
    }
  });
}
