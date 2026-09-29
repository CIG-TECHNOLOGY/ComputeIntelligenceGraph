import { formatDashboardApiError } from "../apiErrors";

describe("dashboard API error feedback", () => {
  it("explains that a missing workspace route requires the current API deployment", () => {
    expect(formatDashboardApiError({
      status: 404,
      message: "Route GET:/api/v1/organizations not found",
    }, "workspace")).toBe(
      "Workspace services are not available on the current API deployment (HTTP 404). Deploy the latest API, then retry.",
    );
  });

  it("explains that analytics schema errors require a migration", () => {
    expect(formatDashboardApiError({
      status: 500,
      message: 'column "public_share_token_hash" does not exist',
    }, "analytics")).toBe(
      "Analytics is temporarily unavailable because its database schema is out of date (HTTP 500). The latest API migration must run before analytics can load. Retry after deployment.",
    );
  });

  it("keeps useful status context for an otherwise unknown analytics failure", () => {
    expect(formatDashboardApiError({ status: 503, message: "upstream timeout" }, "analytics")).toBe(
      "Analytics service is unavailable (HTTP 503): upstream timeout",
    );
  });
});
