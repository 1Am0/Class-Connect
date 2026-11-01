"use client";
import { createContext, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  localizeMessage,
  translator,
  type Locale,
  type NamespaceName,
} from "@/lib/i18n";
import { intlLocale, LOCALE_COOKIE } from "@/lib/i18n/locales";

const LocaleContext = createContext<Locale>("en");

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** The Intl locale for dates and numbers ("en-US", "es-US"). */
export function useIntl() {
  return intlLocale(useLocale());
}

export function useT<N extends NamespaceName>(name: N) {
  const locale = useLocale();
  return useMemo(() => translator(locale, name), [locale, name]);
}

/** Translates English text from the server or shared code. */
export function useLocalize() {
  const locale = useLocale();
  return useMemo(
    () => (english: string) => localizeMessage(locale, english),
    [locale],
  );
}

/** Saves a language for this browser and redraws the page in it. */
export function useSetLocale() {
  const router = useRouter();
  return (locale: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = locale;
    router.refresh();
  };
}
