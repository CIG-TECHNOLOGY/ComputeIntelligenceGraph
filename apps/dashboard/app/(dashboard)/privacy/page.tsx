"use client";

import { useTranslation } from "@cig-technology/i18n/react";
import { LegalDrawer } from "@cig/ui/components";

export default function PrivacyPage() {
  const t = useTranslation();

  return (
    <main className="min-h-[calc(100vh-8rem)] px-0 py-0 sm:px-2 sm:py-2">
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
    </main>
  );
}
