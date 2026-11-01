import { parseDelimited } from "./roster-import";

export interface VocabularyPair {
  spanish: string;
  english: string;
}

export type VocabularyImportMode = "add" | "replace";
export type VocabularyImportStatus = "ready" | "duplicate" | "incomplete";

const spanishHeader = /^(spanish(\s+(word|phrase|term))?|espa[nñ]ol|term)$/i;
const englishHeader =
  /^(english(\s+(meaning|translation))?|meaning|translation|definition)$/i;
const normalized = (value: string) => value.trim().replace(/\s+/g, " ");
const pairKey = (row: VocabularyPair) =>
  `${normalized(row.spanish).toLocaleLowerCase()}\0${normalized(row.english).toLocaleLowerCase()}`;

export function parseVocabularyImport(text: string): VocabularyPair[] {
  if (text.length > 1024 * 1024)
    throw new Error("Import up to 1 MB of text at a time.");
  const delimiter = text.includes("\t") ? "\t" : ",";
  const rows = parseDelimited(text, delimiter);
  if (!rows.length) throw new Error("Add some word pairs to import.");

  const headers = rows[0].map(normalized);
  const spanishIndex = headers.findIndex((cell) => spanishHeader.test(cell));
  const englishIndex = headers.findIndex((cell) => englishHeader.test(cell));
  const hasHeaders = spanishIndex >= 0 && englishIndex >= 0;
  const content = hasHeaders ? rows.slice(1) : rows;
  if (!content.length)
    throw new Error("Add some word pairs below the headers.");
  if (content.length > 100)
    throw new Error("Import up to 100 pairs at a time.");

  return content.map((row, index) => {
    if (!hasHeaders && row.length > 2)
      throw new Error(
        `Row ${index + 1} has more than two columns. Put phrases containing commas in quotes.`,
      );
    const pair = {
      spanish: normalized(row[hasHeaders ? spanishIndex : 0] ?? ""),
      english: normalized(row[hasHeaders ? englishIndex : 1] ?? ""),
    };
    if (pair.spanish.length > 500 || pair.english.length > 500)
      throw new Error(`Row ${index + 1} is longer than 500 characters.`);
    return pair;
  });
}

export function reviewVocabularyImport(
  rows: VocabularyPair[],
  existing: { text: string; supporting_text: string }[],
  mode: VocabularyImportMode,
): (VocabularyPair & { status: VocabularyImportStatus })[] {
  const seen = new Set(
    mode === "add"
      ? existing.map((item) =>
          pairKey({ spanish: item.text, english: item.supporting_text }),
        )
      : [],
  );
  return rows.map((row) => {
    if (!row.spanish || !row.english)
      return { ...row, status: "incomplete" as const };
    const key = pairKey(row);
    if (seen.has(key)) return { ...row, status: "duplicate" as const };
    seen.add(key);
    return { ...row, status: "ready" as const };
  });
}
