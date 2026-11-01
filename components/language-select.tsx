"use client";
import { Languages } from "lucide-react";
import { locales, type Locale } from "@/lib/i18n/locales";
import { CustomSelect } from "./custom-select";
import { useLocale, useSetLocale, useT } from "./i18n";

/** The language picker on pages without Settings (sign-in, student check-in). */
export function LanguageSelect({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const t = useT("common");
  return (
    <div className={"language-select " + className}>
      <Languages size={17} aria-hidden="true" />
      <CustomSelect
        value={locale}
        ariaLabel={t("language")}
        options={locales.map((item) => ({
          value: item.code,
          label: item.name,
        }))}
        onChange={(value) => setLocale(value as Locale)}
      />
    </div>
  );
}
