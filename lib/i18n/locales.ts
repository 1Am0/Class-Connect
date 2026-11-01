// Every language the site speaks. To add one: copy lib/i18n/en to a new
// folder (for example lib/i18n/fr), translate the text, add it to
// lib/i18n/catalog.ts, and list it here. Anything not yet translated
// falls back to English.
export const locales = [
  { code: "en", name: "English", intl: "en-US" },
  { code: "es", name: "Español", intl: "es-US" },
] as const;

export type Locale = (typeof locales)[number]["code"];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "class_connect_locale";

export function isLocale(value: unknown): value is Locale {
  return locales.some((locale) => locale.code === value);
}

/** The Intl locale used for dates and numbers. */
export function intlLocale(locale: Locale) {
  return locales.find((item) => item.code === locale)?.intl ?? "en-US";
}

/** Best match for a browser's Accept-Language header. */
export function matchLocale(header: string | null | undefined): Locale {
  const wanted = (header ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.toLowerCase(), q: q ? Number(q.split("=")[1]) : 1 };
    })
    .filter((item) => item.tag && item.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of wanted) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}
