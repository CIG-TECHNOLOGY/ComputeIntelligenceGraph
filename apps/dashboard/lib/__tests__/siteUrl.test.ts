import {
  buildDashboardRequestPath,
  isProtectedDashboardHostname,
  normalizeDashboardRedirectPath,
  resolveDashboardUrl,
  resolveDocsUrl,
  resolveLandingLoggedOutUrl,
  resolveLandingSignInUrl,
  resolveLandingUrl,
} from "../siteUrl";

describe("siteUrl", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalDashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL;
  const originalDocsUrl = process.env.NEXT_PUBLIC_DOCS_URL;

  afterEach(() => {
    if (originalSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    }

    if (originalDashboardUrl === undefined) {
      delete process.env.NEXT_PUBLIC_DASHBOARD_URL;
    } else {
      process.env.NEXT_PUBLIC_DASHBOARD_URL = originalDashboardUrl;
    }

    if (originalDocsUrl === undefined) {
      delete process.env.NEXT_PUBLIC_DOCS_URL;
    } else {
      process.env.NEXT_PUBLIC_DOCS_URL = originalDocsUrl;
    }
  });

  it("uses localhost landing when the dashboard runs on loopback", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://cig.lat";

    expect(
      resolveLandingUrl({ hostname: "localhost", protocol: "http:" }),
    ).toBe("http://localhost:3000");
    expect(
      resolveLandingLoggedOutUrl({ hostname: "localhost", protocol: "http:" }),
    ).toBe("http://localhost:3000?logged_out=1");
  });

  it("falls back to the configured site url on production hosts", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://cig.lat";

    expect(
      resolveLandingUrl({ hostname: "app.cig.lat", protocol: "https:" }),
    ).toBe("https://cig.lat");
  });

  it("uses the landing technology domain and main dashboard lat domain when no public URLs are configured", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_DASHBOARD_URL;
    delete process.env.NEXT_PUBLIC_DOCS_URL;

    expect(resolveLandingUrl({ hostname: "app.cig.lat", protocol: "https:" })).toBe(
      "https://cig.lat",
    );
    expect(resolveDashboardUrl({ hostname: "cig.technology", protocol: "https:" })).toBe(
      "https://app.cig.lat",
    );
    expect(resolveDocsUrl({ hostname: "cig.technology", protocol: "https:" })).toBe(
      "https://cig.technology/documentation",
    );
  });

  it("uses localhost docs when the dashboard runs on loopback", () => {
    process.env.NEXT_PUBLIC_DOCS_URL = "https://cig.lat/documentation";

    expect(
      resolveDocsUrl({ hostname: "localhost", protocol: "http:" }),
    ).toBe("http://localhost:3004/documentation");
  });

  it("falls back to the configured docs url on production hosts", () => {
    process.env.NEXT_PUBLIC_DOCS_URL = "https://cig.lat/documentation";

    expect(
      resolveDocsUrl({ hostname: "app.cig.lat", protocol: "https:" }),
    ).toBe("https://cig.lat/documentation");
  });

  it("uses localhost dashboard when the dashboard runs on loopback", () => {
    process.env.NEXT_PUBLIC_DASHBOARD_URL = "https://app.cig.lat";

    expect(
      resolveDashboardUrl({ hostname: "localhost", protocol: "http:" }),
    ).toBe("http://localhost:3001");
  });

  it("falls back to the configured dashboard url on production hosts", () => {
    process.env.NEXT_PUBLIC_DASHBOARD_URL = "https://app.cig.lat";

    expect(
      resolveDashboardUrl({ hostname: "app.cig.lat", protocol: "https:" }),
    ).toBe("https://app.cig.lat");
  });

  it("builds a production landing sign-in redirect with the requested dashboard path", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://cig.lat";

    expect(
      resolveLandingSignInUrl({
        hostname: "app.cig.lat",
        protocol: "https:",
        dashboardPath: "/graph?x=1",
      }),
    ).toBe("https://cig.lat/?auth=signin&dashboard_redirect=%2Fgraph%3Fx%3D1");
  });

  it("normalizes dashboard redirect paths to relative dashboard routes only", () => {
    expect(normalizeDashboardRedirectPath("/graph?x=1")).toBe("/graph?x=1");
    expect(normalizeDashboardRedirectPath("https://evil.test/path", "/")).toBe("/");
    expect(normalizeDashboardRedirectPath("//evil.test/path", "/")).toBe("/");
    expect(normalizeDashboardRedirectPath("graph", "/")).toBe("/");
  });

  it("builds request paths from pathname and search safely", () => {
    expect(buildDashboardRequestPath("/resources", "?page=2")).toBe("/resources?page=2");
  });

  it("protects only the production dashboard hostname", () => {
    expect(isProtectedDashboardHostname("app.cig.lat")).toBe(true);
    expect(isProtectedDashboardHostname("localhost")).toBe(false);
    expect(isProtectedDashboardHostname("preview.cig.lat")).toBe(false);
  });
});
