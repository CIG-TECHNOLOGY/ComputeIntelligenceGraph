import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { alertChannels, orgMembers, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["email", "slack", "webhook"]),
  config: z.record(z.string()),
});

async function getOrgId(req: NextRequest): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;

  const [m] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(users.email, session.user.email))
    .limit(1);

  return m?.orgId ?? null;
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req);
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const [channel] = await db
    .insert(alertChannels)
    .values({ orgId, ...parsed.data })
    .returning();

  return NextResponse.json(channel, { status: 201 });
}

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req);
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channels = await db
    .select()
    .from(alertChannels)
    .where(eq(alertChannels.orgId, orgId));

  return NextResponse.json(channels);
}
