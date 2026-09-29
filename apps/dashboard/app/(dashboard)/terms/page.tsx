"use client";

import { useTranslation } from "@cig-technology/i18n/react";
import { LegalDrawer } from "@cig/ui/components";

export default function TermsPage() {
  const t = useTranslation();

  return (
    <main className="min-h-[calc(100vh-8rem)] px-0 py-0 sm:px-2 sm:py-2">
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
    </main>
  );
}
