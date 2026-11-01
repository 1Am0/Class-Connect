import assert from "node:assert/strict";
import test from "node:test";
import {
  parseVocabularyImport,
  reviewVocabularyImport,
} from "../lib/vocabulary-import";

test("pasted pairs and CSV headers preserve quoted commas", () => {
  const rows = parseVocabularyImport(
    'Spanish,English\n"buenos, días",good morning\nhola,hello',
  );
  assert.deepEqual(rows, [
    { spanish: "buenos, días", english: "good morning" },
    { spanish: "hola", english: "hello" },
  ]);
  assert.deepEqual(parseVocabularyImport("hola\thello\nadiós\tgoodbye"), [
    { spanish: "hola", english: "hello" },
    { spanish: "adiós", english: "goodbye" },
  ]);
});

test("header mapping accepts reversed columns", () => {
  assert.deepEqual(parseVocabularyImport("Meaning,Spanish Word\nhello,hola"), [
    { spanish: "hola", english: "hello" },
  ]);
});

test("review flags incomplete rows and exact duplicates for adding or replacing", () => {
  const rows = parseVocabularyImport("hola,hello\nhola,hello\nadiós,");
  const existing = [{ text: "Hola", supporting_text: "Hello" }];
  assert.deepEqual(
    reviewVocabularyImport(rows, existing, "add").map((row) => row.status),
    ["duplicate", "duplicate", "incomplete"],
  );
  assert.deepEqual(
    reviewVocabularyImport(rows, existing, "replace").map((row) => row.status),
    ["ready", "duplicate", "incomplete"],
  );
});

test("malformed, empty, and very large imports are rejected", () => {
  assert.throws(() => parseVocabularyImport(""), /Add some word pairs/);
  assert.throws(() => parseVocabularyImport('"unclosed,hello'), /quoted cell/);
  assert.throws(
    () => parseVocabularyImport(Array(101).fill("hola,hello").join("\n")),
    /100 pairs/,
  );
});
