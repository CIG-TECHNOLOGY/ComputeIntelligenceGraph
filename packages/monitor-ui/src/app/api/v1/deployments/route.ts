import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deployments, apiKeys, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { z } from "zod";

const schema = z.object({
  version: z.string().min(1).max(255),
  environment: z.string().max(64).default("production"),
});

async function resolveOrgFromApiKey(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const rawKey = authHeader.slice(7);
  const hash = createHash("sha256").update(rawKey).digest("hex");

  const [found] = await db
    .select({ orgId: apiKeys.orgId })
    .from(apiKeys)
    .where(eq(apiKeys.keyHash, hash))
    .limit(1);

  return found?.orgId ?? null;
}

export async function POST(req: NextRequest) {
  const orgId = await resolveOrgFromApiKey(req.headers.get("authorization"));
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const [deployment] = await db
    .insert(deployments)
    .values({ orgId, ...parsed.data })
    .returning();

  return NextResponse.json(deployment, { status: 201 });
}
