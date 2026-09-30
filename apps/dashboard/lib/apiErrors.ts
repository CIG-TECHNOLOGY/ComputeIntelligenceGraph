type ApiErrorLike = {
  status?: number;
  message?: string;
};

export type DashboardApiFeature = "analytics" | "workspace" | "general";

function statusFrom(error: ApiErrorLike): number | undefined {
  return typeof error.status === "number" && Number.isFinite(error.status)
    ? error.status
    : undefined;
}

function messageFrom(error: ApiErrorLike): string {
  return typeof error.message === "string" && error.message.trim()
    ? error.message.trim()
    : "The API request failed.";
}

export function formatDashboardApiError(
  error: ApiErrorLike,
  feature: DashboardApiFeature = "general",
): string {
  const status = statusFrom(error);
  const message = messageFrom(error);
  const normalized = message.toLowerCase();

  if (feature === "workspace" && status === 404 && normalized.includes("organizations")) {
    return "Workspace services are not available on the current API deployment (HTTP 404). Deploy the latest API, then retry.";
  }

  if (feature === "workspace" && status === 401) {
    return "Your dashboard session has expired or was not transferred to this app (HTTP 401). Sign in again, then retry loading workspaces.";
  }

  if (feature === "workspace" && status === 403) {
    return "Your account is authenticated, but it does not have a verified email for workspace access (HTTP 403). Verify the account email, then retry.";
  }

  if (!status && /(failed to fetch|networkerror|network request failed|load failed)/.test(normalized)) {
    return `${feature === "workspace" ? "Workspace service" : "API service"} could not be reached. Check the API deployment or browser network policy, then retry.`;
  }

  if (
    feature === "analytics" &&
    status === 500 &&
    /(column|relation|table|migration|schema|does not exist)/.test(normalized)
  ) {
    return "Analytics is temporarily unavailable because its database schema is out of date (HTTP 500). The latest API migration must run before analytics can load. Retry after deployment.";
  }

  if (status && status >= 500) {
    return `${feature === "analytics" ? "Analytics service" : "API service"} is unavailable (HTTP ${status}): ${message}`;
  }

  if (status) return `${message} (HTTP ${status})`;
  return message;
}
