import { parseDelimited } from "./roster-import";

export type TextActivityKind = "conversation" | "scramble";
export type ActivityTextImportMode = "add" | "replace";
export interface ActivityTextRow {
  text: string;
  supporting_text: string;
}
export type ActivityTextStatus = "ready" | "duplicate" | "incomplete";

const clean = (value: string) => value.trim().replace(/\s+/g, " ");
const primaryHeaders: Record<TextActivityKind, RegExp> = {
  conversation: /^(spanish\s*)?(question|prompt)$/i,
  scramble: /^(correct\s*)?(spanish\s*)?(sentence|phrase)$/i,
};
const supportingHeader =
  /^(?:english(?:\s+(?:translation|meaning|hint|question|sentence))?|translation|meaning|hint)$/i;
const rowKey = (row: ActivityTextRow) =>
  `${clean(row.text).toLocaleLowerCase()}\0${clean(row.supporting_text).toLocaleLowerCase()}`;

export function parseActivityTextImport(
  source: string,
  kind: TextActivityKind,
): ActivityTextRow[] {
  if (source.length > 1024 * 1024)
    throw new Error("Import up to 1 MB of text at a time.");
  const rows = parseDelimited(source, source.includes("\t") ? "\t" : ",");
  if (!rows.length) throw new Error("Add some sentences to import.");
  const headers = rows[0].map(clean);
  const textIndex = headers.findIndex((cell) =>
    primaryHeaders[kind].test(cell),
  );
  const supportIndex = headers.findIndex((cell) => supportingHeader.test(cell));
  const hasHeaders = textIndex >= 0;
  const content = hasHeaders ? rows.slice(1) : rows;
  if (!content.length) throw new Error("Add some sentences below the headers.");
  if (content.length > 100)
    throw new Error("Import up to 100 sentences at a time.");

  return content.map((row, index) => {
    if (row.length > 2)
      throw new Error(
        `Row ${index + 1} has more than two columns. Put sentences containing commas in quotes.`,
      );
    const imported = {
      text: clean(row[hasHeaders ? textIndex : 0] ?? ""),
      supporting_text: clean(row[hasHeaders ? supportIndex : 1] ?? ""),
    };
    if (imported.text.length > 500 || imported.supporting_text.length > 500)
      throw new Error(`Row ${index + 1} is longer than 500 characters.`);
    return imported;
  });
}

export function reviewActivityTextImport(
  rows: ActivityTextRow[],
  existing: ActivityTextRow[],
  mode: ActivityTextImportMode,
): (ActivityTextRow & { status: ActivityTextStatus })[] {
  const seen = new Set(mode === "add" ? existing.map(rowKey) : []);
  return rows.map((row) => {
    if (!row.text) return { ...row, status: "incomplete" as const };
    const key = rowKey(row);
    if (seen.has(key)) return { ...row, status: "duplicate" as const };
    seen.add(key);
    return { ...row, status: "ready" as const };
  });
}
