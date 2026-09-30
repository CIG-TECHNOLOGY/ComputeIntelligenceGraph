"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  useResolvedDocsUrl,
  useResolvedLandingUrl,
} from "@cig/ui/siteUrl.client";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  Copy,
  Download,
  Github,
  Layers3,
  Package,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useTranslation } from "@cig-technology/i18n/react";
import { getPublishedCliVersion } from "../../lib/publishedCli";

const steps = [
  {
    titleKey: "install.steps.download.title",
    descKey: "install.steps.download.desc",
    icon: Download,
  },
  {
    titleKey: "install.steps.wizard.title",
    descKey: "install.steps.wizard.desc",
    icon: Terminal,
  },
  {
    titleKey: "install.steps.mode.title",
    descKey: "install.steps.mode.desc",
    icon: Layers3,
  },
  {
    titleKey: "install.steps.seed.title",
    descKey: "install.steps.seed.desc",
    icon: Sparkles,
  },
];

const checklistKeys = [
  "install.prereqs.node",
  "install.prereqs.docker",
  "install.prereqs.compose",
  "install.prereqs.memory",
  "install.prereqs.disk",
  "install.prereqs.ports",
];

interface InstallContentProps {
  cliNpmUrl: string;
  cliSourceUrl: string;
}

export default function InstallContent({
  cliNpmUrl,
  cliSourceUrl,
}: InstallContentProps) {
  const t = useTranslation();
  const [copied, setCopied] = useState(false);
  const [latestPublishedCliVersion, setLatestPublishedCliVersion] = useState<string | null | undefined>(undefined);
  const docsUrl = useResolvedDocsUrl();
  const landingUrl = useResolvedLandingUrl();
  const installCommand = "curl -fsSL https://cig.lat/install.sh | bash";

  useEffect(() => {
    let active = true;

    void getPublishedCliVersion().then((version) => {
      if (active) {
        setLatestPublishedCliVersion(version);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const latestCliVersionBadge = latestPublishedCliVersion
    ? t("install.webInstall.versionBadge", { version: `v${latestPublishedCliVersion}` })
    : latestPublishedCliVersion === null
      ? t("install.webInstall.versionUnavailable")
      : t("install.webInstall.versionLoading");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures and keep the installer available.
    }
  }, [installCommand]);

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-50">
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-400/10" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-400/10" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/80 bg-cyan-50/90 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-900 dark:border-cyan-800/70 dark:bg-cyan-950/45 dark:text-cyan-100">
            <BadgeCheck size={14} />
            cig.lat/install
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-4 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-800/80 dark:bg-zinc-900/80 dark:text-zinc-300">
            <BadgeCheck size={14} />
            Public installer and onboarding guide
          </span>
        </div>

        <section className="grid gap-8 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="min-w-0 space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-cyan-500/90 dark:text-cyan-300/90">
                {t("install.title")}
              </p>
              <h1 className="max-w-3xl break-words text-3xl font-black tracking-tight sm:text-4xl md:text-5xl lg:text-6xl">
                {t("install.headline")}
              </h1>
              <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400 md:text-lg">
                {t("install.description")}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 sm:flex-row">
              <Link
                href="/install.sh"
                download
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-950/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                <Download size={16} />
                {t("install.downloadBtn")}
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white/85 px-6 py-3 text-sm font-semibold text-zinc-800 shadow transition-all hover:-translate-y-0.5 hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/85 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800/85"
              >
                <ArrowLeft size={16} />
                {t("install.backHome")}
              </Link>
            </div>

            <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/85 p-5 shadow-2xl shadow-cyan-950/10 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/70">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
                    {t("install.webInstall.title")}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    {t("install.webInstall.subtitle")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <a
                    href={cliNpmUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-900 transition hover:border-cyan-300 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-100 dark:hover:border-cyan-700 dark:hover:bg-cyan-950"
                  >
                    <Package size={12} />
                    {latestCliVersionBadge}
                  </a>
                  <a
                    href={cliSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900/85 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
                  >
                    <Github size={12} />
                    {t("install.webInstall.sourceCode")}
                  </a>
                  <span className="shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-900 dark:border-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-100">
                    curl | bash
                  </span>
                </div>
              </div>
              <div className="relative group overflow-hidden rounded-2xl">
                <pre className="overflow-x-auto rounded-2xl bg-zinc-950 px-4 py-4 text-sm leading-7 text-cyan-100 shadow-inner sm:px-5">
                  <code className="block pr-24 sm:pr-28">{installCommand}</code>
                </pre>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-zinc-900/90 px-2.5 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/40 hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 sm:right-3 sm:top-3 sm:gap-2 sm:px-3"
                  title={copied ? t("common.copied") : t("common.copy")}
                  aria-label={copied ? t("common.copied") : t("common.copy")}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span className="hidden sm:inline">{copied ? t("common.copied") : t("common.copy")}</span>
                </button>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {t("install.webInstall.localScript")}
                <span className="font-mono text-zinc-900 dark:text-zinc-100"> ./install.sh</span>.
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                The public installer resolves the current published npm version
                before launching the wizard, so the version banner matches the
                binary you actually install.
              </p>
            </div>
          </div>

          <aside className="min-w-0 space-y-4">
            <div className="rounded-3xl border border-zinc-200/80 bg-white/85 p-5 shadow-xl shadow-zinc-950/10 dark:border-zinc-800/80 dark:bg-zinc-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
                {t("install.prereqs.title")}
              </p>
              <div className="mt-4 space-y-3">
                {checklistKeys.map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-700 dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:text-zinc-300"
                  >
                    <BadgeCheck size={16} className="text-emerald-500" />
                    <span>{t(key)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-200/80 bg-white/85 p-5 shadow-xl shadow-zinc-950/10 dark:border-zinc-800/80 dark:bg-zinc-950/70">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
                {t("install.modes.title")}
              </p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/70">
                  <p className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">
                    {t("install.modes.selfHosted.title")}
                  </p>
                  <p>{t("install.modes.selfHosted.desc")}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200/70 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/70">
                  <p className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">
                    {t("install.modes.managed.title")}
                  </p>
                  <p>{t("install.modes.managed.desc")}</p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.titleKey}
                className="rounded-3xl border border-zinc-200/80 bg-white/85 p-5 shadow-lg shadow-zinc-950/10 dark:border-zinc-800/80 dark:bg-zinc-950/70"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/15 via-blue-500/15 to-violet-500/15 ring-1 ring-cyan-500/20">
                  <Icon size={20} className="text-cyan-500 dark:text-cyan-300" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {t(step.titleKey)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                  {t(step.descKey)}
                </p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-zinc-200/80 bg-white/85 p-6 shadow-xl shadow-zinc-950/10 dark:border-zinc-800/80 dark:bg-zinc-950/70">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
              {t("install.after.title")}
            </p>
            <div className="mt-4 space-y-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              <p>{t("install.after.desc1")}</p>
              <p>
                {t("install.after.setupCmd.prefix")}{" "}
                <span className="font-mono text-zinc-900 dark:text-zinc-100">cig setup</span>{" "}
                {t("install.after.setupCmd.suffix")}
              </p>
              <p>
                {t("install.after.statusCmd.prefix")}{" "}
                <span className="font-mono text-zinc-900 dark:text-zinc-100">cig status</span>{" "}
                {t("install.after.statusCmd.and")}{" "}
                <span className="font-mono text-zinc-900 dark:text-zinc-100">cig open</span>{" "}
                {t("install.after.statusCmd.suffix")}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200/80 bg-white/85 p-6 shadow-xl shadow-zinc-950/10 dark:border-zinc-800/80 dark:bg-zinc-950/70">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">
              {t("install.quickLinks.title")}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/install.sh"
                download
                className="flex items-center justify-between rounded-2xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-4 text-sm font-semibold text-zinc-800 transition-all hover:border-cyan-300 hover:bg-cyan-50/80 dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/35"
              >
                <span className="inline-flex items-center gap-2">
                  <Terminal size={16} className="text-cyan-500" />
                  {t("install.quickLinks.installer")}
                </span>
                <ArrowRight size={16} className="text-zinc-500" />
              </Link>
              <a
                href={landingUrl}
                className="flex items-center justify-between rounded-2xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-4 text-sm font-semibold text-zinc-800 transition-all hover:border-cyan-300 hover:bg-cyan-50/80 dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/35"
              >
                <span className="inline-flex items-center gap-2">
                  <Download size={16} className="text-violet-500" />
                  {t("install.quickLinks.landing")}
                </span>
                <ArrowRight size={16} className="text-zinc-500" />
              </a>
              <a
                href={docsUrl}
                className="flex items-center justify-between rounded-2xl border border-zinc-200/70 bg-zinc-50/80 px-4 py-4 text-sm font-semibold text-zinc-800 transition-all hover:border-cyan-300 hover:bg-cyan-50/80 dark:border-zinc-800/80 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:border-cyan-700 dark:hover:bg-cyan-950/35"
              >
                <span className="inline-flex items-center gap-2">
                  <BookOpen size={16} className="text-cyan-500" />
                  {t("resources.docs")}
                </span>
                <ArrowRight size={16} className="text-zinc-500" />
              </a>
            </div>

            <p className="mt-4 text-sm leading-6 text-zinc-500 dark:text-zinc-500">
              {t("install.quickLinks.desc")}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
