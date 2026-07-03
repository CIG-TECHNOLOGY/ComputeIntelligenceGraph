import { requireTenantSession } from "@/lib/session";
import { db } from "@/lib/db";
import { alertChannels } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import AddChannelForm from "./AddChannelForm";

const TYPE_LABEL: Record<string, string> = {
  email: "Email",
  slack: "Slack Webhook",
  webhook: "Custom Webhook",
};

export default async function AlertsPage() {
  const { orgId } = await requireTenantSession();

  const channels = await db
    .select()
    .from(alertChannels)
    .where(eq(alertChannels.orgId, orgId))
    .orderBy(alertChannels.createdAt);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Alert Channels</h1>
      <p className="mb-6 text-sm text-gray-500">
        Alerts fire when a monitor transitions to DOWN. Each channel below is
        notified within one check cycle.
      </p>

      {/* Existing channels */}
      {channels.length > 0 && (
        <div className="mb-8 overflow-hidden rounded-xl border bg-white">
          <ul className="divide-y divide-gray-100">
            {channels.map((ch) => {
              const cfg = ch.config as Record<string, string>;
              return (
                <li
                  key={ch.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ch.name}</p>
                    <p className="text-xs text-gray-400">
                      {TYPE_LABEL[ch.type] ?? ch.type}
                      {cfg.to && ` · ${cfg.to}`}
                      {cfg.url && ` · ${cfg.url}`}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      ch.enabled
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {ch.enabled ? "Active" : "Disabled"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AddChannelForm />
    </div>
  );
}
