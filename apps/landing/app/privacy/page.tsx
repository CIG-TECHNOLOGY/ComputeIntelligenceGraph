"use client";

import { useId } from "react";
import { useTranslation } from "@cig-technology/i18n/react";
import { LegalDrawer } from "@cig/ui/components";

function PrivacyCollectorBackdrop() {
  const uniqueId = useId().replace(/:/g, "");
  const gradientPrefix = `privacy-collector-${uniqueId}`;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      viewBox="0 0 1200 960"
      preserveAspectRatio="none"
    >
      <defs>
        <radialGradient id={`${gradientPrefix}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
          <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${gradientPrefix}-beam`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.05" />
          <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.08" />
        </linearGradient>
        <filter id={`${gradientPrefix}-soft`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <g opacity="0.75">
        <path
          d="M 110 160 C 260 160, 360 240, 470 340 S 700 500, 840 420 S 990 280, 1070 230"
          stroke={`url(#${gradientPrefix}-beam)`}
          strokeWidth="1.2"
          fill="none"
          strokeDasharray="7 14"
          pathLength="100"
        >
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="5s" repeatCount="indefinite" />
        </path>
        <path
          d="M 70 420 C 230 380, 330 360, 470 395 S 760 500, 930 420 S 1060 320, 1130 290"
          stroke={`url(#${gradientPrefix}-beam)`}
          strokeWidth="1"
          fill="none"
          strokeDasharray="4 13"
          pathLength="100"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="100" dur="6s" repeatCount="indefinite" />
        </path>
        <path
          d="M 140 700 C 290 620, 390 560, 495 470 S 690 300, 830 320 S 980 370, 1090 470"
          stroke={`url(#${gradientPrefix}-beam)`}
          strokeWidth="1.1"
          fill="none"
          strokeDasharray="8 12"
          pathLength="100"
        >
          <animate attributeName="stroke-dashoffset" from="100" to="0" dur="7s" repeatCount="indefinite" />
        </path>
      </g>

      <g filter={`url(#${gradientPrefix}-soft)`} opacity="0.9">
        <circle cx="112" cy="168" r="26" fill={`url(#${gradientPrefix}-glow)`}>
          <animate attributeName="cy" values="168;150;168" dur="4.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.15;0.45;0.15" dur="4.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="1040" cy="250" r="22" fill={`url(#${gradientPrefix}-glow)`}>
          <animate attributeName="cx" values="1040;1000;1040" dur="5.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.12;0.38;0.12" dur="5.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="102" cy="690" r="24" fill={`url(#${gradientPrefix}-glow)`}>
          <animate attributeName="cy" values="690;650;690" dur="6.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.12;0.4;0.12" dur="6.2s" repeatCount="indefinite" />
        </circle>
      </g>

      <g fill="#67e8f9" opacity="0.95">
        <circle cx="180" cy="190" r="3">
          <animate attributeName="cy" values="190;270;190" dur="5.2s" repeatCount="indefinite" />
          <animate attributeName="cx" values="180;300;180" dur="5.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="1020" cy="300" r="2.8">
          <animate attributeName="cy" values="300;360;300" dur="5.8s" repeatCount="indefinite" />
          <animate attributeName="cx" values="1020;910;1020" dur="5.8s" repeatCount="indefinite" />
        </circle>
        <circle cx="180" cy="660" r="3">
          <animate attributeName="cy" values="660;590;660" dur="6.4s" repeatCount="indefinite" />
          <animate attributeName="cx" values="180;290;180" dur="6.4s" repeatCount="indefinite" />
        </circle>
        <circle cx="980" cy="650" r="2.5">
          <animate attributeName="cy" values="650;570;650" dur="6.8s" repeatCount="indefinite" />
          <animate attributeName="cx" values="980;860;980" dur="6.8s" repeatCount="indefinite" />
        </circle>
      </g>

      <g opacity="0.55">
        <rect x="470" y="300" width="260" height="260" rx="130" fill={`url(#${gradientPrefix}-glow)`} />
      </g>
    </svg>
  );
}

export default function PrivacyPage() {
  const t = useTranslation();

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-4 py-8 text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-50 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(167,139,250,0.08),_transparent_28%)] dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.09),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.1),_transparent_30%)]" />
      <PrivacyCollectorBackdrop />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
        <LegalDrawer
          eyebrow={t("legal.privacy.eyebrow")}
          title={t("legal.privacy.title")}
          description={t("legal.privacy.description")}
          backHref="/"
          backLabel={t("common.back")}
          fullPolicyHref="https://cig.technology/documentation/docs/en/legal/privacy-policy"
          fullPolicyLabel={t("legal.fullPolicy")}
          note={t("legal.privacy.note")}
          sections={[
            {
              title: t("legal.privacy.sections.collect.title"),
              body: t("legal.privacy.sections.collect.body"),
            },
            {
              title: t("legal.privacy.sections.use.title"),
              body: t("legal.privacy.sections.use.body"),
            },
            {
              title: t("legal.privacy.sections.share.title"),
              body: t("legal.privacy.sections.share.body"),
            },
          ]}
        />
      </div>
    </main>
  );
}
