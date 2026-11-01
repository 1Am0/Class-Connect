import type { Locale } from "./locales";
import { serverMessages as es } from "./es/server-messages";

/**
 * Messages that come from the server or shared code in English, translated
 * by their English text. A new language adds its own file and lists it here.
 */
const catalogs: Partial<Record<Locale, Record<string, string>>> = { es };

export function serverCatalog(locale: Locale) {
  return catalogs[locale];
}
