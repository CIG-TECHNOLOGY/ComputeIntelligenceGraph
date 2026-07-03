import { requireTenantSession } from "@/lib/session";
import Link from "next/link";
import { signOut } from "@/lib/auth";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/incidents", label: "Incidents" },
  { href: "/dashboard/alerts", label: "Alert Channels" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { orgName, orgSlug } = await requireTenantSession();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-bold text-gray-900">CIG Monitor</span>
            <nav className="flex gap-4">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <a
              href={`/status/${orgSlug}`}
              target="_blank"
              className="text-sm text-indigo-600 hover:underline"
            >
              Status Page ↗
            </a>
            <span className="text-sm text-gray-400">{orgName}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1">{children}</main>
    </div>
  );
}
