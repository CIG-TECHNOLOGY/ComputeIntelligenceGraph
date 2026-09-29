"use client";

import { useEffect, useState } from "react";

type RuntimeVersionPayload = {
  version?: string;
  releaseTag?: string;
};

function runtimeVersionUrl(): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim().replace(/\/$/, "") || "";
  return `${basePath}/runtime-version.json?ts=${Date.now()}`;
}

function getRuntimeVersion(payload: RuntimeVersionPayload | null): string {
  return (payload?.version || payload?.releaseTag || "").replace(/^v/, "");
}

/**
 * Returns the release marker served with the deployed site. This lets every
 * landing footer recover from a stale cached HTML/JavaScript shell.
 */
export function useRuntimeVersion(buildTimeVersion = process.env.NEXT_PUBLIC_APP_VERSION || ""): string {
  const [version, setVersion] = useState(buildTimeVersion);

  useEffect(() => {
    let cancelled = false;

    fetch(runtimeVersionUrl(), {
      cache: "no-store",
      headers: { "cache-control": "no-cache" },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: RuntimeVersionPayload | null) => {
        const currentVersion = getRuntimeVersion(payload);
        if (!cancelled && currentVersion) setVersion(currentVersion);
      })
      .catch(() => {
        // Preserve the build-time value when the runtime marker is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return version;
}
