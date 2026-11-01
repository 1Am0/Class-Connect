import assert from "node:assert/strict";
import test from "node:test";
import {
  parseActivityTextImport,
  reviewActivityTextImport,
} from "../lib/activity-text-import";

test("conversation prompts import one or two columns with optional headers", () => {
  assert.deepEqual(
    parseActivityTextImport(
      'English Translation,Spanish Question\n"How are you?","¿Cómo estás?"',
      "conversation",
    ),
    [{ text: "¿Cómo estás?", supporting_text: "How are you?" }],
  );
  assert.deepEqual(
    parseActivityTextImport(
      "¿Qué hora es?\n¿Cuántos años tienes?",
      "conversation",
    ),
    [
      { text: "¿Qué hora es?", supporting_text: "" },
      { text: "¿Cuántos años tienes?", supporting_text: "" },
    ],
  );
  assert.deepEqual(
    parseActivityTextImport("Question\n¿Qué hora es?", "conversation"),
    [{ text: "¿Qué hora es?", supporting_text: "" }],
  );
});

test("sentence scramble imports tab-separated sentences and optional hints", () => {
  assert.deepEqual(
    parseActivityTextImport(
      "Correct Spanish Sentence\tEnglish Hint\nEs hora de comer\tIt is time to eat",
      "scramble",
    ),
    [{ text: "Es hora de comer", supporting_text: "It is time to eat" }],
  );
});

test("review skips exact duplicates and flags missing sentences", () => {
  const rows = parseActivityTextImport(
    "Es hora de comer,It is time to eat\nEs hora de comer,It is time to eat\n,Missing sentence",
    "scramble",
  );
  const existing = [
    { text: "es hora de comer", supporting_text: "It is time to eat" },
  ];
  assert.deepEqual(
    reviewActivityTextImport(rows, existing, "add").map((row) => row.status),
    ["duplicate", "duplicate", "incomplete"],
  );
  assert.deepEqual(
    reviewActivityTextImport(rows, existing, "replace").map(
      (row) => row.status,
    ),
    ["ready", "duplicate", "incomplete"],
  );
});

test("import rejects malformed, oversized, and extra-column rows", () => {
  assert.throws(() => parseActivityTextImport("", "conversation"), /Add some/);
  assert.throws(
    () => parseActivityTextImport('"unclosed', "scramble"),
    /quoted cell/,
  );
  assert.throws(
    () => parseActivityTextImport("hola,hello,extra", "conversation"),
    /more than two columns/,
  );
  assert.throws(
    () =>
      parseActivityTextImport(
        Array(101).fill("¿Cómo estás?").join("\n"),
        "conversation",
      ),
    /100/,
  );
});
