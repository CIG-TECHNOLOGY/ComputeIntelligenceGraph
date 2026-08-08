import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ProductionAuthGuard } from "../ProductionAuthGuard";
import { clearBrowserSession, getBrowserAccessToken } from "../../lib/cigClient";

const mockUsePathname = jest.fn();
const mockUseSearchParams = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

jest.mock("../../lib/cigClient", () => ({
  clearBrowserSession: jest.fn(),
  getBrowserAccessToken: jest.fn(),
}));

const mockGetBrowserAccessToken = jest.mocked(getBrowserAccessToken);
const mockClearBrowserSession = jest.mocked(clearBrowserSession);

describe("ProductionAuthGuard", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockUsePathname.mockReturnValue("/graph");
    mockUseSearchParams.mockReturnValue(new URLSearchParams("x=1"));
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        hostname: "app.cig.lat",
        protocol: "https:",
        replace: jest.fn(),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("tries a silent re-auth first when no browser session exists", async () => {
    mockGetBrowserAccessToken.mockReturnValue(null);

    render(
      <ProductionAuthGuard>
        <div>Protected content</div>
      </ProductionAuthGuard>,
    );

    expect(screen.getByText("Redirecting to sign in…")).toBeInTheDocument();

    await waitFor(() => {
      expect(window.location.replace).toHaveBeenCalledWith("/auth/silent");
    });
    // Falls through to the normal sign-in redirect, not this attempt —
    // silent re-auth may still succeed and never reach login-callback here.
    expect(mockClearBrowserSession).not.toHaveBeenCalled();
  });

  it("falls back to the sign-in redirect once silent re-auth has already been tried", async () => {
    mockGetBrowserAccessToken.mockReturnValue(null);
    sessionStorage.setItem("cig_silent_auth_attempted", "1");

    render(
      <ProductionAuthGuard>
        <div>Protected content</div>
      </ProductionAuthGuard>,
    );

    expect(screen.getByText("Redirecting to sign in…")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockClearBrowserSession).toHaveBeenCalledTimes(1);
      expect(window.location.replace).toHaveBeenCalledWith(
        "https://cig.lat/?auth=signin&dashboard_redirect=%2Fgraph%3Fx%3D1",
      );
    });
  });

  it("renders children when a valid browser session exists", () => {
    mockGetBrowserAccessToken.mockReturnValue("token");

    render(
      <ProductionAuthGuard>
        <div>Protected content</div>
      </ProductionAuthGuard>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(mockClearBrowserSession).not.toHaveBeenCalled();
  });
});
