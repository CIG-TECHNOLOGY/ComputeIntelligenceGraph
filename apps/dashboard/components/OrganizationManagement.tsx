"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createOrganizationShareLink,
  inviteOrganizationMember,
  listOrganizations,
  type OrganizationSummary,
  type OrganizationWorkspace,
  updateOrganizationMembershipPolicy,
} from "../lib/organizations";
import { formatDashboardApiError } from "../lib/apiErrors";

export function OrganizationManagement() {
  const [workspace, setWorkspace] = useState<OrganizationWorkspace | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [maxUses, setMaxUses] = useState(10);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void listOrganizations().then((result) => {
      setWorkspace(result);
      setSelectedId(result.activeOrganizationId);
    }).catch((caught) => setError(formatDashboardApiError(
      caught instanceof Error ? caught : { message: "Organization settings could not be loaded." },
      "workspace",
    )));
  }, []);

  const organization = useMemo(
    () => workspace?.items.find((item) => item.id === selectedId) ?? null,
    [selectedId, workspace],
  );
  const canManageMembers = organization?.role === "owner" || organization?.role === "admin";
  const canSetDomainPolicy = organization?.kind === "shared" && organization.role === "owner";

  function resetNotice() {
    setError(null);
    setMessage(null);
  }

  async function sendInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organization) return;
    resetNotice();
    try {
      await inviteOrganizationMember(organization.id, { email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      setMessage("Invitation sent. It can only be accepted by that email address.");
    } catch (caught) {
      setError(formatDashboardApiError(caught instanceof Error ? caught : {}, "workspace"));
    }
  }

  async function createShareLink() {
    if (!organization) return;
    resetNotice();
    try {
      const link = await createOrganizationShareLink(organization.id, maxUses);
      setShareUrl(link.url);
      setMessage(`Share link created. It expires ${new Date(link.expiresAt).toLocaleDateString()}.`);
    } catch (caught) {
      setError(formatDashboardApiError(caught instanceof Error ? caught : {}, "workspace"));
    }
  }

  async function setMembershipPolicy(membershipPolicy: OrganizationSummary["membershipPolicy"]) {
    if (!organization || !workspace) return;
    resetNotice();
    try {
      const updated = await updateOrganizationMembershipPolicy(organization.id, membershipPolicy);
      setWorkspace({ ...workspace, items: workspace.items.map((item) => item.id === updated.id ? updated : item) });
      setMessage(membershipPolicy === "domain_verified"
        ? "Verified users at this domain can now join this shared workspace."
        : "This workspace now requires an invitation or a controlled share link.");
    } catch (caught) {
      setError(formatDashboardApiError(caught instanceof Error ? caught : {}, "workspace"));
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="border-b border-gray-100 px-6 py-3 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Organization & workspace</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Choose who can access each workspace and how they join.</p>
      </div>
      <div className="space-y-4 px-6 py-4">
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
          Workspace
          <select value={selectedId} onChange={(event) => { setSelectedId(event.target.value); resetNotice(); setShareUrl(null); }}
            className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950">
            {workspace?.items.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.role}</option>)}
          </select>
        </label>

        {organization && <>
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <strong className="text-gray-900 dark:text-gray-100">{organization.domain}</strong> · {organization.kind === "personal" ? "Personal home workspace" : "Shared workspace"}
          </div>

          {canSetDomainPolicy && <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            Join policy
            <select value={organization.membershipPolicy} onChange={(event) => void setMembershipPolicy(event.target.value as OrganizationSummary["membershipPolicy"])}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950">
              <option value="invite_only">Invitations and share links only</option>
              <option value="domain_verified">Allow verified @{organization.domain} accounts</option>
            </select>
          </label>}

          {organization.kind === "personal" && <p className="text-xs text-gray-500 dark:text-gray-400">Your personal home workspace is tied to its original account domain and cannot be edited.</p>}

          {canManageMembers && <form onSubmit={sendInvitation} className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Invite by email</p>
            <div className="flex gap-2">
              <input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="person@example.com"
                className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950" />
              <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "member" | "admin")}
                className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-950">
                <option value="member">Member</option><option value="admin">Admin</option>
              </select>
              <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Invite</button>
            </div>
          </form>}

          {canManageMembers && <div className="space-y-2 border-t border-gray-100 pt-4 dark:border-gray-800">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Controlled share link</p>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={100} value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))}
                className="w-20 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-950" aria-label="Maximum link uses" />
              <span className="text-xs text-gray-500 dark:text-gray-400">uses, expires in 7 days</span>
              <button type="button" onClick={() => void createShareLink()} className="ml-auto rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800">Create link</button>
            </div>
            {shareUrl && <input readOnly value={shareUrl} aria-label="Share link" onFocus={(event) => event.currentTarget.select()}
              className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 font-mono text-xs dark:border-gray-600 dark:bg-gray-950" />}
          </div>}
        </>}
        {message && <p className="text-xs text-green-700 dark:text-green-300">{message}</p>}
        {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </section>
  );
}
