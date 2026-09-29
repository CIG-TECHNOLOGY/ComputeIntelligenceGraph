"use client";

import { type ReactNode } from "react";
import { FooterBar } from "@cig/ui/components";
import { useResolvedDocsUrl } from "@cig/ui/siteUrl.client";
import { AuthButton } from "./AuthButton";
import { PreferencesMenu } from "./PreferencesMenu";
import { useTranslation } from "@cig-technology/i18n/react";
import { BackToTop } from "./BackToTop";
import { useRuntimeVersion } from "./useRuntimeVersion";

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/* ─── Footer ──────────────────────────────────────────────────────────── */
function Footer() {
  const t = useTranslation();
  const version = useRuntimeVersion();
  const build = process.env.NEXT_PUBLIC_APP_BUILD || "";
  const docsUrl = useResolvedDocsUrl();

  const meta = [
    t("footer.licenseNotice", { year: new Date().getFullYear() }),
    version ? t("common.version", { version }) : "",
    build ? t("common.build", { build }) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <footer id="site-footer" className="relative w-full border-t border-zinc-200 dark:border-zinc-800/50 px-4 py-4 sm:px-6">
      <div className="relative z-10">
        <FooterBar
          brandLabel={t("footer.brandTitle")}
          brandHref="/"
          subtitle={t("footer.rightsReserved")}
          links={[
            { label: t("footer.docs"), href: docsUrl, external: true },
            { label: t("footer.privacy"), href: "/privacy" },
            { label: t("footer.terms"), href: "/terms" },
          ]}
          meta={meta}
        />
      </div>
    </footer>
  );
}

/* ─── Landing Layout ──────────────────────────────────────────────────── */
interface LandingLayoutProps {
  children: ReactNode;
  className?: string;
}

export function LandingLayout({ children, className }: LandingLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen w-full bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 text-zinc-900 dark:text-zinc-50 relative overflow-x-hidden",
      className
    )}>
      {/* Top auth bar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <PreferencesMenu />
        <AuthButton />
      </div>

      {/* Blob glows — both modes */}
      <div className="pointer-events-none fixed -top-40 -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-600 via-blue-600 to-violet-600 opacity-[0.10] dark:opacity-[0.07] rounded-full blur-3xl animate-pulse-slow z-0" />
      <div className="pointer-events-none fixed -bottom-40 -right-40 w-[500px] h-[500px] bg-gradient-to-bl from-violet-600 via-blue-600 to-cyan-600 opacity-[0.08] dark:opacity-[0.05] rounded-full blur-3xl animate-pulse-slow z-0" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>

      <BackToTop />
    </div>
  );
}
