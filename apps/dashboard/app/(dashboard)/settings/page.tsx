"use client";

import { useState } from "react";
import { useTranslation } from "@cig-technology/i18n/react";
import { useAppStore } from "../../../lib/store";
import { notifyUser } from "../../../components/NotificationBell";
import { OrganizationManagement } from "../../../components/OrganizationManagement";

export default function SettingsPage() {
  const t = useTranslation();
  const { theme, setTheme } = useAppStore();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

  const [wsEnabled, setWsEnabled] = useState(true);
  const [refetchInterval, setRefetchInterval] = useState(30);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    notifyUser(t("settings.saved"), "success" as const);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t("settings.title")}</h1>

      {/* Appearance */}
      <Section title={t("settings.appearance")}>
        <Field label={t("settings.theme")} description={t("settings.themeDesc")}>
          <div className="flex gap-2">
            {(["light", "dark"] as const).map((themeKey) => (
              <button
                key={themeKey}
                onClick={() => setTheme(themeKey)}
                className={[
                  "px-4 py-1.5 rounded-md text-sm font-medium border transition-colors capitalize",
                  theme === themeKey
                    ? "bg-blue-600 text-white border-blue-600"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
                ].join(" ")}
              >
                {t("settings." + themeKey)}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* Data & sync */}
      <Section title={t("settings.dataSync")}>
        <Field label={t("settings.apiEndpoint")} description={t("settings.apiEndpointDesc")}>
          <code className="block rounded bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-xs font-mono text-gray-700 dark:text-gray-300">
            {apiUrl}
          </code>
        </Field>

        <Field label={t("settings.autoRefresh")} description={t("settings.autoRefreshDesc")}>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={120}
              step={10}
              value={refetchInterval}
              onChange={(e) => setRefetchInterval(Number(e.target.value))}
              className="w-32 accent-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 w-12">{refetchInterval}s</span>
          </div>
        </Field>

        <Field label={t("settings.realtimeUpdates")} description={t("settings.realtimeUpdatesDesc")}>
          <Toggle checked={wsEnabled} onChange={setWsEnabled} />
        </Field>
      </Section>

      {/* Organization workspace */}
      <OrganizationManagement />

      {/* About */}
      <Section title={t("settings.about")}>
        <Field label={t("settings.dashboardVersion")} description="">
          <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
            v{process.env.NEXT_PUBLIC_APP_VERSION ?? "—"}
          </span>
        </Field>
        <Field label={t("settings.releaseTag")} description="">
          <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {process.env.NEXT_PUBLIC_RELEASE_TAG ?? process.env.NEXT_PUBLIC_APP_VERSION ?? "—"}
          </span>
        </Field>
      </Section>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className={[
            "rounded-md px-5 py-2 text-sm font-medium text-white transition-colors",
            saved ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700",
          ].join(" ")}
        >
          {saved ? t("settings.saved") : t("settings.save")}
        </button>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
      <div className="px-6 py-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">{children}</div>
    </div>
  );
}

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-6 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600",
        checked ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block size-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        ].join(" ")}
      />
    </button>
  );
}
