"use client";

import { useTranslation } from "@cig-technology/i18n/react";
import { LegalDrawer } from "@cig/ui/components";

export default function TermsPage() {
  const t = useTranslation();

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 px-4 py-8 text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-50 sm:px-6 sm:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center">
        <LegalDrawer
          eyebrow={t("legal.terms.eyebrow")}
          title={t("legal.terms.title")}
          description={t("legal.terms.description")}
          backHref="/"
          backLabel={t("common.back")}
          fullPolicyHref="https://cig.technology/documentation/docs/en/legal/terms-of-service"
          fullPolicyLabel={t("legal.fullPolicy")}
          note={t("legal.terms.note")}
          sections={[
            {
              title: t("legal.terms.sections.access.title"),
              body: t("legal.terms.sections.access.body"),
            },
            {
              title: t("legal.terms.sections.use.title"),
              body: t("legal.terms.sections.use.body"),
            },
            {
              title: t("legal.terms.sections.changes.title"),
              body: t("legal.terms.sections.changes.body"),
            },
          ]}
        />
      </div>
    </main>
  );
}
