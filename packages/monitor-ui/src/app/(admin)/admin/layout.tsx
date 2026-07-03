import { requireSuperAdmin } from "@/lib/session";
import Link from "next/link";
import { signOut } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-bold text-gray-900">CIG Monitor</span>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
              Super Admin
            </span>
            <nav className="flex gap-4">
              <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
                Organizations
              </Link>
            </nav>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1">{children}</main>
    </div>
  );
}
