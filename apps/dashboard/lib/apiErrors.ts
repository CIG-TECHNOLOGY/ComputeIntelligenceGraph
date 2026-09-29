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
