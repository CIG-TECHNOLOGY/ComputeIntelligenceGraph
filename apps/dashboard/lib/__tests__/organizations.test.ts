import {
  acceptOrganizationAccessLink,
  createSharedOrganization,
  getActiveOrganizationId,
  listOrganizations,
  selectOrganization,
} from "../organizations";
import { getDashboardClient } from "../cigClient";

jest.mock("../cigClient", () => ({
  getDashboardClient: jest.fn(),
}));

const mockGetDashboardClient = getDashboardClient as jest.MockedFunction<typeof getDashboardClient>;

describe("dashboard organization workspace client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it("loads the server-selected organization workspace", async () => {
    const requestRaw = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        activeOrganizationId: "org_acme",
        items: [{ id: "org_acme", name: "Acme.example", role: "owner" }],
      }),
    } as Response);
    mockGetDashboardClient.mockReturnValue({ requestRaw } as never);

    await expect(listOrganizations()).resolves.toMatchObject({
      activeOrganizationId: "org_acme",
      items: [{ id: "org_acme", name: "Acme.example" }],
    });
  });

  it("selects a workspace on the server and persists it for all browser API requests", async () => {
    const requestRaw = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ activeOrganizationId: "org_platform" }),
    } as Response);
    mockGetDashboardClient.mockReturnValue({ requestRaw } as never);

    await expect(selectOrganization("org_platform")).resolves.toBe("org_platform");
    expect(requestRaw).toHaveBeenCalledWith("/api/v1/organizations/org_platform/select", { method: "POST" });
    expect(getActiveOrganizationId()).toBe("org_platform");
  });

  it("redeems an authenticated access link and makes its workspace active", async () => {
    const requestRaw = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ organization: { id: "org_joined", name: "Shared", role: "member" } }),
    } as Response);
    mockGetDashboardClient.mockReturnValue({ requestRaw } as never);

    await expect(acceptOrganizationAccessLink("join-links", "signed-token")).resolves.toMatchObject({ id: "org_joined" });
    expect(requestRaw).toHaveBeenCalledWith("/api/v1/organizations/join-links/signed-token/accept", { method: "POST" });
    expect(getActiveOrganizationId()).toBe("org_joined");
  });

  it("creates a separate shared workspace through the canonical organization API", async () => {
    const requestRaw = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ organization: { id: "org_platform", name: "Platform", domain: "acme.example" } }),
    } as Response);
    mockGetDashboardClient.mockReturnValue({ requestRaw } as never);

    await expect(createSharedOrganization({ name: "Platform", domain: "acme.example" })).resolves.toMatchObject({ id: "org_platform" });
    expect(requestRaw).toHaveBeenCalledWith("/api/v1/organizations", {
      method: "POST",
      body: JSON.stringify({ name: "Platform", domain: "acme.example" }),
    });
  });

  it("returns actionable feedback when the deployed API does not have workspace routes", async () => {
    const requestRaw = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ error: "Route GET:/api/v1/organizations not found" }),
    } as Response);
    mockGetDashboardClient.mockReturnValue({ requestRaw } as never);

    await expect(listOrganizations()).rejects.toThrow(
      "Workspace services are not available on the current API deployment (HTTP 404). Deploy the latest API, then retry.",
    );
  });
});
