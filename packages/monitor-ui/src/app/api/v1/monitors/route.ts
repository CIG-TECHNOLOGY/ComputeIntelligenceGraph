import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { monitors, apiKeys, orgMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createHash } from "crypto";
import { z } from "zod";

const createMonitorSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(["http", "tcp", "dns", "ssl", "ping", "heartbeat"]),
  target: z.string().max(2048).optional(),
  intervalSeconds: z.number().int().min(10).max(86400).default(60),
  timeoutSeconds: z.number().int().min(1).max(60).default(10),
  expectedStatus: z.number().int().optional(),
  config: z.record(z.unknown()).optional(),
});

/** Resolve org from session (browser) or API key (CI/CD) */
async function resolveOrgId(req: NextRequest): Promise<string | null> {
  // Try API key first (for CI/CD usage)
  const auth_header = req.headers.get("authorization");
  if (auth_header?.startsWith("Bearer ")) {
    const raw = auth_header.slice(7);
    const hash = createHash("sha256").update(raw).digest("hex");
    const [found] = await db
      .select({ orgId: apiKeys.orgId })
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, hash))
      .limit(1);
    if (found) return found.orgId;
  }

  // Fall back to session
  const session = await auth();
  if (!session?.user?.email) return null;

  const [membership] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .innerJoin(users, eq(users.id, orgMembers.userId))
    .where(eq(users.email, session.user.email))
    .limit(1);

  return membership?.orgId ?? null;
}

export async function GET(req: NextRequest) {
  const orgId = await resolveOrgId(req);
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.orgId, orgId), eq(monitors.enabled, true)));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const orgId = await resolveOrgId(req);
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createMonitorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { name, type, target, intervalSeconds, timeoutSeconds, expectedStatus, config } =
    parsed.data;

  // Heartbeat monitors get an auto-generated slug as target
  const resolvedTarget =
    type === "heartbeat" ? `heartbeat-${crypto.randomUUID()}` : (target ?? "");

  const [monitor] = await db
    .insert(monitors)
    .values({
      orgId,
      name,
      type,
      target: resolvedTarget,
      intervalSeconds,
      timeoutSeconds,
      expectedStatus,
      config: config ?? {},
    })
    .returning();

  return NextResponse.json(monitor, { status: 201 });
}
