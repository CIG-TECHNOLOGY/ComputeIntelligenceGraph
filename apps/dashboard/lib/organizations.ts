import { getDashboardClient } from "./cigClient";
import { formatDashboardApiError } from "./apiErrors";

export type OrganizationRole = "owner" | "admin" | "member";

export type OrganizationSummary = {
  id: string;
  name: string;
  domain: string;
  kind: "personal" | "shared";
  membershipPolicy: "invite_only" | "domain_verified";
  role: OrganizationRole;
};

export type OrganizationWorkspace = {
  activeOrganizationId: string;
  items: OrganizationSummary[];
};

const ACTIVE_ORGANIZATION_STORAGE_KEY = "cig_active_organization_id";

function rememberActiveOrganization(organizationId: string): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
  } catch {
    // The server remains the source of truth if browser storage is unavailable.
  }
}

export function getActiveOrganizationId(): string | null {
  if (typeof window === "undefined") return null;

  try {
    return sessionStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
  } catch {
    return null;
  }
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { error?: string; message?: string };
    return formatDashboardApiError({
      status: response.status,
      message: payload.error ?? payload.message,
    }, "workspace");
  } catch {
    return formatDashboardApiError({ status: response.status }, "workspace");
  }
}

export async function listOrganizations(): Promise<OrganizationWorkspace> {
  const response = await getDashboardClient().requestRaw("/api/v1/organizations");
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const workspace = await response.json() as OrganizationWorkspace;
  rememberActiveOrganization(workspace.activeOrganizationId);
  return workspace;
}

export async function selectOrganization(organizationId: string): Promise<string> {
  const response = await getDashboardClient().requestRaw(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/select`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = await response.json() as { activeOrganizationId: string };
  rememberActiveOrganization(payload.activeOrganizationId);
  return payload.activeOrganizationId;
}

export async function createSharedOrganization(input: { name: string; domain: string }): Promise<OrganizationSummary> {
  const response = await getDashboardClient().requestRaw("/api/v1/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = await response.json() as { organization: OrganizationSummary };
  return payload.organization;
}

export async function updateOrganizationMembershipPolicy(
  organizationId: string,
  membershipPolicy: OrganizationSummary["membershipPolicy"],
): Promise<OrganizationSummary> {
  const response = await getDashboardClient().requestRaw(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/membership-policy`,
    { method: "PATCH", body: JSON.stringify({ membershipPolicy }) },
  );
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json() as { organization: OrganizationSummary }).organization;
}

export async function inviteOrganizationMember(
  organizationId: string,
  input: { email: string; role: "admin" | "member" },
): Promise<void> {
  const response = await getDashboardClient().requestRaw(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/invitations`,
    { method: "POST", body: JSON.stringify(input) },
  );
  if (!response.ok) throw new Error(await getErrorMessage(response));
}

export async function createOrganizationShareLink(
  organizationId: string,
  maxUses: number,
): Promise<{ url: string; expiresAt: string; maxUses: number }> {
  const response = await getDashboardClient().requestRaw(
    `/api/v1/organizations/${encodeURIComponent(organizationId)}/join-links`,
    { method: "POST", body: JSON.stringify({ role: "member", maxUses }) },
  );
  if (!response.ok) throw new Error(await getErrorMessage(response));
  return (await response.json() as { joinLink: { url: string; expiresAt: string; maxUses: number } }).joinLink;
}

export async function acceptOrganizationAccessLink(kind: "invitations" | "join-links", token: string): Promise<OrganizationSummary> {
  const response = await getDashboardClient().requestRaw(
    `/api/v1/organizations/${kind}/${encodeURIComponent(token)}/accept`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const payload = await response.json() as { organization: OrganizationSummary };
  rememberActiveOrganization(payload.organization.id);
  return payload.organization;
}
