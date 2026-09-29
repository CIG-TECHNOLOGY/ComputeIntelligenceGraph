/** @jest-environment node */

import { NextRequest } from "next/server";
import { middleware } from "../middleware";

function makeRequest(url: string, cookie = ""): NextRequest {
  return new NextRequest(url, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("dashboard middleware", () => {
  it("redirects unauthenticated production requests to landing sign-in", () => {
    const response = middleware(makeRequest("https://app.cig.lat/graph?x=1"));

    expect(response.headers.get("location")).toBe(
      "https://cig.lat/?auth=signin&dashboard_redirect=%2Fgraph%3Fx%3D1",
    );
  });

  it("allows localhost requests without forcing landing auth", () => {
    const response = middleware(makeRequest("http://localhost:3001/graph"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows non-production non-local hosts through unchanged", () => {
    const response = middleware(makeRequest("https://preview.cig.lat/graph"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps public auth routes accessible without a session", () => {
    const response = middleware(makeRequest("https://app.cig.lat/auth/callback"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps public analytics share links accessible without a session", () => {
    const response = middleware(makeRequest("https://app.cig.lat/analytics/share/share_token"));

    expect(response.headers.get("location")).toBeNull();
  });
});
