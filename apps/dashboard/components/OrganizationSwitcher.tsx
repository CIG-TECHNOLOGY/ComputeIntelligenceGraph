"use client";

import { Building2, Check, ChevronDown, LoaderCircle, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type OrganizationSummary,
  type OrganizationWorkspace,
  createSharedOrganization,
  listOrganizations,
  selectOrganization,
} from "../lib/organizations";
import { formatDashboardApiError } from "../lib/apiErrors";

export function OrganizationSwitcher() {
  const [workspace, setWorkspace] = useState<OrganizationWorkspace | null>(null);
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceDomain, setWorkspaceDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await listOrganizations());
    } catch (caught) {
      setWorkspace(null);
      setError(formatDashboardApiError(caught instanceof Error ? caught : {}, "workspace"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const active = workspace?.items.find(({ id }) => id === workspace.activeOrganizationId);

  async function switchWorkspace(organization: OrganizationSummary) {
    if (!workspace || organization.id === workspace.activeOrganizationId) {
      setOpen(false);
      return;
    }
    setError(null);
    setSwitchingId(organization.id);
    try {
      const activeOrganizationId = await selectOrganization(organization.id);
      setWorkspace({ ...workspace, activeOrganizationId });
      setOpen(false);
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to switch workspace.");
    } finally {
      setSwitchingId(null);
    }
  }

  async function createWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreatingWorkspace(true);
    try {
      const organization = await createSharedOrganization({ name: workspaceName, domain: workspaceDomain });
      await selectOrganization(organization.id);
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create workspace.");
    } finally {
      setCreatingWorkspace(false);
    }
  }

  return (
    <div ref={menuRef} className="relative px-2.5 pt-2.5">
      <button type="button" onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 rounded-lg border border-cig px-3 py-2 text-left transition-colors hover:bg-cig-hover"
        aria-label="Switch workspace" aria-expanded={open}>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-cig-hover text-cyan-600 dark:text-cyan-300">
          <Building2 className="size-3.5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-cig-primary">
            {active?.name ?? (loading ? "Loading workspace" : error ? "Workspace unavailable" : "No workspace")}
          </span>
          <span className="block truncate text-[10px] text-cig-muted">
            {active?.domain ?? (error ? "Retry to reconnect" : "Organization workspace")}
          </span>
        </span>
        <ChevronDown className={`size-3.5 shrink-0 text-cig-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute bottom-full left-2.5 right-2.5 z-50 mb-1 overflow-hidden rounded-xl border border-cig bg-cig-card py-1 shadow-lg dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-cig-muted">Workspaces</p>
          {loading && <p className="px-3 py-3 text-xs text-cig-muted">Loading workspaces…</p>}
          {!loading && workspace?.items.map((organization) => {
            const selected = organization.id === workspace.activeOrganizationId;
            const isSwitching = switchingId === organization.id;
            return (
              <button key={organization.id} type="button" onClick={() => void switchWorkspace(organization)} disabled={isSwitching}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-cig-hover disabled:cursor-wait">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-cig-hover text-cig-secondary">
                  {isSwitching ? <LoaderCircle className="size-3.5 animate-spin" /> : <Building2 className="size-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-cig-primary">{organization.name}</span>
                  <span className="block truncate text-[10px] text-cig-muted">{organization.role} · {organization.kind === "personal" ? "personal" : "shared"}</span>
                </span>
                {selected && <Check className="size-3.5 shrink-0 text-cyan-600 dark:text-cyan-300" aria-label="Current workspace" />}
              </button>
            );
          })}
          {!loading && workspace && <div className="mx-3 my-1 border-t border-cig" />}
          {!loading && workspace && !creating && (
            <button type="button" onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-cyan-700 transition-colors hover:bg-cig-hover dark:text-cyan-300">
              <Plus className="size-3.5" /> Create shared workspace
            </button>
          )}
          {!loading && workspace && creating && (
            <form onSubmit={createWorkspace} className="space-y-2 px-3 py-2">
              <label className="block text-[10px] font-medium text-cig-secondary">
                Workspace name
                <input required minLength={2} maxLength={80} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-cig bg-cig-base px-2 py-1.5 text-xs text-cig-primary outline-none focus:border-cyan-500" placeholder="Platform team" />
              </label>
              <label className="block text-[10px] font-medium text-cig-secondary">
                Organization domain
                <input required value={workspaceDomain} onChange={(event) => setWorkspaceDomain(event.target.value)}
                  className="mt-1 w-full rounded-md border border-cig bg-cig-base px-2 py-1.5 text-xs text-cig-primary outline-none focus:border-cyan-500" placeholder="example.com" />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCreating(false)} className="rounded-md px-2 py-1 text-xs text-cig-secondary hover:bg-cig-hover">Cancel</button>
                <button disabled={creatingWorkspace} className="rounded-md bg-cyan-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-60">
                  {creatingWorkspace ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          )}
          {error && (
            <div role="alert" className="space-y-2 px-3 py-2 text-xs text-red-600 dark:text-red-400">
              <p>{error}</p>
              <button type="button" onClick={() => void loadWorkspace()} disabled={loading}
                className="font-semibold underline underline-offset-2 disabled:cursor-wait disabled:opacity-60">
                {loading ? "Retrying…" : "Retry loading workspaces"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
