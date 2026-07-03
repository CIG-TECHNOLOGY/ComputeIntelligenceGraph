import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { z } from "zod";

const createOrgSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  plan: z.enum(["free", "starter", "pro"]).default("free"),
  customDomain: z.string().max(255).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createOrgSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { name, slug, plan, customDomain } = parsed.data;

  try {
    const [org] = await db
      .insert(organizations)
      .values({
        name,
        slug,
        plan,
        customDomain: customDomain || null,
        statusPageTitle: `${name} Status`,
      })
      .returning({ id: organizations.id, slug: organizations.slug });

    return NextResponse.json(org, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("unique")) {
      return NextResponse.json(
        { error: `Slug "${slug}" is already taken` },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgs = await db
    .select()
    .from(organizations)
    .orderBy(organizations.createdAt);

  return NextResponse.json(orgs);
}
