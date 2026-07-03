import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, orgMembers, organizations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (!session.user.isSuperAdmin) redirect("/dashboard");
  return session;
}

/** Returns the org the signed-in user belongs to, or redirects if none. */
export async function requireTenantSession() {
  const session = await requireAuth();
  if (session.user.isSuperAdmin) redirect("/admin");

  const [row] = await db
    .select({
      orgId: organizations.id,
      orgSlug: organizations.slug,
      orgName: organizations.name,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .innerJoin(organizations, eq(organizations.id, orgMembers.orgId))
    .where(eq(users.email, session.user.email!))
    .limit(1);

  if (!row) {
    // User has no org yet — show a "contact CIG" holding page
    redirect("/no-org");
  }

  return { session, ...row };
}
