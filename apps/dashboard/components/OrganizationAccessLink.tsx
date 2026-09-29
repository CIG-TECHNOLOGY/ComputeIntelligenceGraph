"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { acceptOrganizationAccessLink, type OrganizationSummary } from "../lib/organizations";

export function OrganizationAccessLink({ kind, token }: { kind: "invitations" | "join-links"; token: string }) {
  const [organization, setOrganization] = useState<OrganizationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void acceptOrganizationAccessLink(kind, token).then(setOrganization).catch((caught) => {
      setError(caught instanceof Error ? caught.message : "This access link could not be used.");
    });
  }, [kind, token]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-cig bg-cig-card px-6 py-10 text-center shadow-sm">
      {!organization && !error && <p className="text-sm text-cig-secondary">Joining workspace…</p>}
      {organization && <>
        <p className="text-sm font-medium text-cyan-600 dark:text-cyan-300">Workspace access granted</p>
        <h1 className="mt-2 text-xl font-semibold text-cig-primary">{organization.name}</h1>
        <p className="mt-2 text-sm text-cig-secondary">You are now a {organization.role} in this workspace.</p>
        <Link href="/" className="mt-6 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500">Open dashboard</Link>
      </>}
      {error && <>
        <h1 className="text-xl font-semibold text-cig-primary">This link is unavailable</h1>
        <p className="mt-2 text-sm text-cig-secondary">{error}</p>
        <Link href="/" className="mt-6 rounded-lg border border-cig px-4 py-2 text-sm font-semibold text-cig-primary hover:bg-cig-hover">Return to dashboard</Link>
      </>}
    </div>
  );
}
