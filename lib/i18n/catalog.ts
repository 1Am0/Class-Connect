import { en } from "./en";
import { es } from "./es";
import type { Locale } from "./locales";
import type { Namespace, Translation } from "./translate";

export type Messages = typeof en;
export type NamespaceName = keyof Messages;

/** A language's text. Spanish is complete; a new language may start partial. */
export type LanguagePack = {
  [N in NamespaceName]?: Partial<Translation<Messages[N]>>;
};
export type CompletePack = {
  [N in NamespaceName]: Translation<Messages[N]>;
};

const packs: Record<Locale, LanguagePack> = { en, es };

/** One namespace in a language, with English filling any gaps. */
export function namespaceFor<N extends NamespaceName>(
  locale: Locale,
  name: N,
): Namespace {
  const base = en[name] as Namespace;
  const translated = packs[locale]?.[name] as Namespace | undefined;
  return translated ? { ...base, ...translated } : base;
}
