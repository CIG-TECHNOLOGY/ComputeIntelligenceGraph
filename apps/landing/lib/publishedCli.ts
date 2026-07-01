const CIG_CLI_PACKAGE_NAME = "@cig-technology/cli";

export const CIG_CLI_NPM_URL = `https://www.npmjs.com/package/${encodeURIComponent(CIG_CLI_PACKAGE_NAME)}`;
export const CIG_CLI_SOURCE_URL = "https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/tree/main/packages/cli";

export async function getPublishedCliVersion(): Promise<string | null> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(CIG_CLI_PACKAGE_NAME)}/latest`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null) {
      return null;
    }

    const version = (payload as { version?: unknown }).version;
    if (typeof version !== "string") {
      return null;
    }

    const normalized = version.trim();
    return normalized.length > 0 ? normalized : null;
  } catch {
    return null;
  }
}
