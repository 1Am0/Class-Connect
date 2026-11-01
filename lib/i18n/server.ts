import { cookies, headers } from "next/headers";
import { isLocale, LOCALE_COOKIE, matchLocale, type Locale } from "./locales";
import { translator } from "./index";
import type { NamespaceName } from "./catalog";

/** The visitor's language: their saved choice, else their browser's. */
export async function getLocale(): Promise<Locale> {
  try {
    const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
    if (isLocale(saved)) return saved;
    return matchLocale((await headers()).get("accept-language"));
  } catch {
    // Outside a request (tests, build): English.
    return "en";
  }
}

export async function getT<N extends NamespaceName>(name: N) {
  return translator(await getLocale(), name);
}
