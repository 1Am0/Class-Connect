// A small translator: "{name}" placeholders, plural forms chosen with
// Intl.PluralRules, and <tag>…</tag> spans for rich text.
export type PluralMessage = {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};
export type Message = string | PluralMessage;
export type Namespace = Record<string, Message>;
export type Vars = Record<string, string | number>;

/** The same keys as English, so a language can't silently drop text. */
export type Translation<T extends Namespace> = { [K in keyof T]: Message };

const pluralRules = new Map<string, Intl.PluralRules>();
function pluralFor(intl: string, count: number) {
  let rules = pluralRules.get(intl);
  if (!rules) pluralRules.set(intl, (rules = new Intl.PluralRules(intl)));
  return rules.select(count) as keyof PluralMessage;
}

export function format(
  message: Message | undefined,
  vars: Vars | undefined,
  intl: string,
): string {
  if (message === undefined) return "";
  let text: string;
  if (typeof message === "string") text = message;
  else {
    const count = Number(vars?.count ?? 0);
    text =
      (count === 0 && message.zero) ||
      message[pluralFor(intl, count)] ||
      message.other;
  }
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => {
    const value = vars[name];
    if (value === undefined) return whole;
    return typeof value === "number" ? value.toLocaleString(intl) : value;
  });
}

/** Splits "Press <b>Save</b> now" into text and tagged parts. */
export function splitTags(text: string) {
  const parts: ({ text: string } | { tag: string; text: string })[] = [];
  const pattern = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > last)
      parts.push({ text: text.slice(last, match.index) });
    parts.push({ tag: match[1], text: match[2] });
    last = match.index! + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/**
 * Server and library messages are written in English. A language lists the
 * ones it translates by their English text, with "{name}" standing for any
 * part that changes ("Row {row}: …").
 */
export function translateMessage(
  english: string,
  catalog: Record<string, string> | undefined,
): string {
  if (!catalog || !english) return english;
  const exact = catalog[english];
  if (exact !== undefined) return exact;
  for (const [pattern, translated] of compiled(catalog)) {
    const match = pattern.regex.exec(english);
    if (!match) continue;
    return translated.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const index = pattern.names.indexOf(name);
      if (index < 0) return whole;
      // Nested parts (a reason inside "Name: reason") are translated too,
      // and so is each item of a list ("8–20 characters, at least one…").
      const part = match[index + 1];
      const translated = translateMessage(part, catalog);
      if (translated !== part || !part.includes(", ")) return translated;
      return part
        .split(", ")
        .map((item) => translateMessage(item, catalog))
        .join(", ");
    });
  }
  return english;
}

const cache = new WeakMap<
  Record<string, string>,
  [{ regex: RegExp; names: string[] }, string][]
>();
function compiled(catalog: Record<string, string>) {
  let list = cache.get(catalog);
  if (list) return list;
  list = [];
  for (const [english, translated] of Object.entries(catalog)) {
    if (!english.includes("{")) continue;
    const names: string[] = [];
    const source = english
      .split(/(\{\w+\})/)
      .map((part) => {
        const name = /^\{(\w+)\}$/.exec(part)?.[1];
        if (name) {
          names.push(name);
          return "([\\s\\S]+?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    list.push([{ regex: new RegExp(`^${source}$`), names }, translated]);
  }
  cache.set(catalog, list);
  return list;
}
