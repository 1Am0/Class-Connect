import { createElement, Fragment, type ReactNode } from "react";
import { namespaceFor, type NamespaceName, type Messages } from "./catalog";
import { intlLocale, type Locale } from "./locales";
import { serverCatalog } from "./server-messages";
import { format, splitTags, translateMessage, type Vars } from "./translate";

export type { Locale } from "./locales";
export type { Messages, NamespaceName } from "./catalog";

export type Translator<N extends NamespaceName> = {
  (key: keyof Messages[N] & string, vars?: Vars): string;
  /** Text with <tag>…</tag> parts rendered by the given functions. */
  rich(
    key: keyof Messages[N] & string,
    tags: Record<string, (text: string) => ReactNode>,
    vars?: Vars,
  ): ReactNode;
};

export function translator<N extends NamespaceName>(
  locale: Locale,
  name: N,
): Translator<N> {
  const messages = namespaceFor(locale, name);
  const intl = intlLocale(locale);
  const t = ((key: string, vars?: Vars) =>
    format(messages[key], vars, intl)) as unknown as Translator<N>;
  t.rich = (key, tags, vars) =>
    createElement(
      Fragment,
      null,
      ...splitTags(format(messages[key], vars, intl)).map((part, index) =>
        "tag" in part && tags[part.tag]
          ? createElement(Fragment, { key: index }, tags[part.tag](part.text))
          : part.text,
      ),
    );
  return t;
}

/** Translate an English message from the server or shared code. */
export function localizeMessage(locale: Locale, english: string) {
  return locale === "en"
    ? english
    : translateMessage(english, serverCatalog(locale));
}
