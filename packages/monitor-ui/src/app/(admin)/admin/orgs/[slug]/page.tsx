import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  organizations,
  monitors,
  checkResults,
  orgMembers,
  users,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Link from "next/link";

const STATUS_DOT: Record<string, string> = {
  up: "bg-green-500",
  down: "bg-red-500",
  degraded: "bg-yellow-500",
  unknown: "bg-gray-400",
};

export default async function OrgDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, params.slug));

  if (!org) notFound();

  const [allMonitors, members] = await Promise.all([
    db
      .select()
      .from(monitors)
      .where(eq(monitors.orgId, org.id))
      .orderBy(monitors.name),
    db
      .select({
        email: users.email,
        name: users.name,
        role: orgMembers.role,
        joinedAt: orgMembers.createdAt,
      })
      .from(orgMembers)
      .innerJoin(users, eq(users.id, orgMembers.userId))
      .where(eq(orgMembers.orgId, org.id))
      .orderBy(orgMembers.createdAt),
  ]);

  const latestByMonitor = await Promise.all(
    allMonitors.map(async (m) => {
      const [latest] = await db
        .select()
        .from(checkResults)
        .where(eq(checkResults.monitorId, m.id))
        .orderBy(desc(checkResults.checkedAt))
        .limit(1);
      return { id: m.id, status: latest?.status ?? "unknown" };
    })
  );
  const statusMap = Object.fromEntries(
    latestByMonitor.map((r) => [r.id, r.status])
  );

  return (
    <div className="p-8">
      <div className="mb-2 text-sm text-gray-400">
        <Link href="/admin" className="hover:underline">
          Organizations
        </Link>{" "}
        / {org.name}
      </div>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
          <p className="text-sm text-gray-500">
            Slug: <code>{org.slug}</code> · Plan:{" "}
            <span className="capitalize">{org.plan}</span>
          </p>
          {org.customDomain && (
            <p className="text-sm text-gray-500">
              Custom domain:{" "}
              <a
                href={`https://${org.customDomain}`}
                target="_blank"
                className="text-indigo-600 hover:underline"
              >
                {org.customDomain} ↗
              </a>
            </p>
          )}
          <p className="text-sm text-gray-500">
            Default status page:{" "}
            <a
              href={`https://${org.slug}.status.cig.technology`}
              target="_blank"
              className="text-indigo-600 hover:underline"
            >
              {org.slug}.status.cig.technology ↗
            </a>
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
            org.plan === "pro"
              ? "bg-purple-50 text-purple-700"
              : org.plan === "starter"
              ? "bg-blue-50 text-blue-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {org.plan}
        </span>
      </div>

      {/* Monitors */}
      <section className="mb-8">
        <h2 className="mb-3 font-semibold text-gray-900">
          Monitors ({allMonitors.length})
        </h2>
        <div className="overflow-hidden rounded-xl border bg-white">
          {allMonitors.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              No monitors configured by this org yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {allMonitors.map((m) => {
                const status = statusMap[m.id] ?? "unknown";
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`}
                      />
                      <span className="text-sm text-gray-800">{m.name}</span>
                      <span className="text-xs text-gray-400">
                        {m.type.toUpperCase()} · {m.target}
                      </span>
                    </div>
                    <span className="text-xs capitalize text-gray-500">{status}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Members */}
      <section>
        <h2 className="mb-3 font-semibold text-gray-900">
          Members ({members.length})
        </h2>
        <div className="overflow-hidden rounded-xl border bg-white">
          {members.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-400">
              No members — tenant has not logged in yet.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {members.map((m) => (
                <li
                  key={m.email}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {m.name ?? m.email}
                    </p>
                    {m.name && (
                      <p className="text-xs text-gray-400">{m.email}</p>
                    )}
                  </div>
                  <span className="text-xs capitalize text-gray-500">{m.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
