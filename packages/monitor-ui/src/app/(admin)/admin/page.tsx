import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizations, monitors, checkResults } from "@/lib/db/schema";
import { desc, count, eq } from "drizzle-orm";
import Link from "next/link";

export default async function AdminDashboard() {
  const session = await auth();
  if (!session?.user.isSuperAdmin) redirect("/dashboard");

  const orgs = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      plan: organizations.plan,
      customDomain: organizations.customDomain,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt));

  const monitorCounts = await db
    .select({ orgId: monitors.orgId, count: count() })
    .from(monitors)
    .groupBy(monitors.orgId);

  const countByOrg = Object.fromEntries(
    monitorCounts.map((r) => [r.orgId, r.count])
  );

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Organizations</h1>
          <p className="text-sm text-gray-500">{orgs.length} tenants</p>
        </div>
        <Link
          href="/admin/orgs/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + New Org
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-6 py-3">Organization</th>
              <th className="px-6 py-3">Plan</th>
              <th className="px-6 py-3">Monitors</th>
              <th className="px-6 py-3">Domain</th>
              <th className="px-6 py-3">Created</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {orgs.map((org) => (
              <tr key={org.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{org.name}</div>
                  <div className="text-gray-400">{org.slug}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 capitalize">
                    {org.plan}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {countByOrg[org.id] ?? 0}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {org.customDomain
                    ? org.customDomain
                    : `${org.slug}.status.cig.technology`}
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {org.createdAt.toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/orgs/${org.slug}`}
                    className="text-indigo-600 hover:underline"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
