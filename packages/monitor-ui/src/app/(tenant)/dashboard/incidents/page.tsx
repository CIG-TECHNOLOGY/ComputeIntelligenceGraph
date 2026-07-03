import { requireTenantSession } from "@/lib/session";
import { db } from "@/lib/db";
import { incidents, incidentUpdates, monitors } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

const STATUS_BADGE: Record<string, string> = {
  investigating: "bg-red-50 text-red-700",
  identified: "bg-orange-50 text-orange-700",
  monitoring: "bg-yellow-50 text-yellow-700",
  resolved: "bg-green-50 text-green-700",
};

export default async function IncidentsPage() {
  const { orgId } = await requireTenantSession();

  const allIncidents = await db
    .select({
      id: incidents.id,
      title: incidents.title,
      status: incidents.status,
      startedAt: incidents.startedAt,
      resolvedAt: incidents.resolvedAt,
      monitorName: monitors.name,
    })
    .from(incidents)
    .leftJoin(monitors, eq(monitors.id, incidents.monitorId))
    .where(eq(incidents.orgId, orgId))
    .orderBy(desc(incidents.startedAt))
    .limit(50);

  return (
    <div className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Incidents</h1>

      {allIncidents.length === 0 ? (
        <div className="rounded-xl border bg-white px-6 py-16 text-center">
          <p className="text-sm text-gray-400">No incidents recorded. All good!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allIncidents.map((inc) => (
            <div key={inc.id} className="rounded-xl border bg-white px-6 py-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{inc.title}</p>
                  {inc.monitorName && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      Monitor: {inc.monitorName}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    Started: {inc.startedAt.toLocaleString()}
                    {inc.resolvedAt &&
                      ` · Resolved: ${inc.resolvedAt.toLocaleString()}`}
                  </p>
                </div>
                <span
                  className={`ml-4 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[inc.status]}`}
                >
                  {inc.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
