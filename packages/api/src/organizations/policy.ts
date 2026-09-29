export type OrganizationMembershipPolicy = 'invite_only' | 'domain_verified';

export interface DefaultOrganizationProfile {
  name: string;
  domain: string;
  membershipPolicy: OrganizationMembershipPolicy;
  domainLocked: true;
}

export interface DomainMembershipRequest {
  verifiedEmail: string;
  organizationDomain: string;
  membershipPolicy: OrganizationMembershipPolicy;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function domainFromEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf('@');

  if (atIndex <= 0 || atIndex === normalized.length - 1) {
    throw new Error('A verified email address is required to establish an organization.');
  }

  return normalized.slice(atIndex + 1);
}

function displayDomain(domain: string): string {
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

export function createDefaultOrganizationProfile(verifiedEmail: string): DefaultOrganizationProfile {
  const domain = domainFromEmail(verifiedEmail);

  return {
    name: displayDomain(domain),
    domain,
    membershipPolicy: 'invite_only',
    domainLocked: true,
  };
}

export function canAutoJoinDomainOrganization(request: DomainMembershipRequest): boolean {
  return request.membershipPolicy === 'domain_verified'
    && domainFromEmail(request.verifiedEmail) === request.organizationDomain.trim().toLowerCase();
}

export function canAcceptEmailInvitation(verifiedEmail: string, invitedEmail: string): boolean {
  return normalizeEmail(verifiedEmail) === normalizeEmail(invitedEmail);
}
