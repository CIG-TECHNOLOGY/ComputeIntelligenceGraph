import { describe, expect, it } from 'vitest';
import {
  canAutoJoinDomainOrganization,
  canAcceptEmailInvitation,
  createDefaultOrganizationProfile,
} from './policy';

describe('organization domain policy', () => {
  it('creates an immutable invite-only home organization from a verified email domain', () => {
    expect(createDefaultOrganizationProfile('  Alice@Acme.Example ')).toEqual({
      name: 'Acme.example',
      domain: 'acme.example',
      membershipPolicy: 'invite_only',
      domainLocked: true,
    });
  });

  it('only admits a verified matching-domain user when domain-wide access is enabled', () => {
    expect(canAutoJoinDomainOrganization({
      verifiedEmail: 'member@acme.example',
      organizationDomain: 'acme.example',
      membershipPolicy: 'domain_verified',
    })).toBe(true);

    expect(canAutoJoinDomainOrganization({
      verifiedEmail: 'outsider@other.example',
      organizationDomain: 'acme.example',
      membershipPolicy: 'domain_verified',
    })).toBe(false);

    expect(canAutoJoinDomainOrganization({
      verifiedEmail: 'member@acme.example',
      organizationDomain: 'acme.example',
      membershipPolicy: 'invite_only',
    })).toBe(false);
  });

  it('binds an email invitation to its intended recipient', () => {
    expect(canAcceptEmailInvitation('member@acme.example', ' Member@Acme.Example ')).toBe(true);
    expect(canAcceptEmailInvitation('member@acme.example', 'other@acme.example')).toBe(false);
  });
});
