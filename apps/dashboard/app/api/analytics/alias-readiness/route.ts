import { NextResponse } from "next/server";

const ALLOWED_HOST = /^[a-z0-9](?:[a-z0-9_-]{0,61}[a-z0-9])?\.(?:analytics\.cig\.lat|analytics\.cig\.technology)$/i;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ ready: false, error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return NextResponse.json({ ready: false, error: "Invalid url" }, { status: 400 });
  }

  if (target.protocol !== "https:" || !ALLOWED_HOST.test(target.hostname) || target.pathname !== "/") {
    return NextResponse.json({ ready: false, error: "Unsupported hostname" }, { status: 400 });
  }

  try {
    const response = await fetch(target, {
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
    });
    return NextResponse.json({ ready: response.status >= 200 && response.status < 400, status: response.status });
  } catch {
    return NextResponse.json({ ready: false, status: 0 });
  }
}
