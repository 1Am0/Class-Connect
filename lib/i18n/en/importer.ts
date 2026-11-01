import type { Namespace } from "../translate";

// Importing words, prompts and sentences into an activity set.
export default {
  readWordsFailed: "Could not read these words.",
  readSentencesFailed: "Could not read these sentences.",
  fileTooBig: "Choose a CSV file smaller than 1 MB.",
  fileFailed: "Could not read this file. Try a UTF-8 CSV file.",
  titleWords: "Import vocabulary",
  titlePrompts: "Import prompts",
  titleSentences: "Import sentences",
  introWords: "Paste two columns, Spanish then English, or choose a CSV file.",
  introPrompts:
    "Paste one Spanish question per line. Add an optional English translation as a second column.",
  introSentences:
    "Paste one Spanish sentence per line. Add an optional English hint as a second column.",
  close: "Close import",
  method: "Import method",
  addWords: "Add to current words",
  addPrompts: "Add to current prompts",
  addSentences: "Add to current sentences",
  replaceWords: "Replace all current words",
  replacePrompts: "Replace all current prompts",
  replaceSentences: "Replace all current sentences",
  sourceWords: "Word pairs",
  sourcePrompts: "Questions",
  sourceSentences: "Sentences",
  placeholderWords: "Spanish,English\nhola,hello\nadiós,goodbye",
  upload: "Upload CSV",
  previewWords: "Preview words",
  previewPrompts: "Preview prompts",
  previewSentences: "Preview sentences",
  toAdd: "{count} to add",
  toReplace: "{count} to replace with",
  duplicates: {
    one: " · 1 duplicate skipped",
    other: " · {count} duplicates skipped",
  },
  incomplete: " · {count} incomplete",
  previewLabelWords: "Vocabulary import preview",
  previewLabelPrompts: "Prompts import preview",
  previewLabelSentences: "Sentences import preview",
  spanishMissing: "Spanish missing",
  englishMissing: "English missing",
  questionMissing: "Spanish question missing",
  sentenceMissing: "Correct Spanish sentence missing",
  noHint: "No English hint",
  statusNew: "New",
  statusDuplicate: "Duplicate",
  needsBoth: "Needs both words",
  needsSpanish: "Needs Spanish",
  limitWords: "A set can hold up to 100 words. Remove some or choose Replace.",
  limitPrompts:
    "A set can hold up to 100 prompts. Remove some or choose Replace.",
  limitSentences:
    "A set can hold up to 100 sentences. Remove some or choose Replace.",
  fixIncomplete:
    "Complete or remove incomplete rows in the source, then preview again.",
  applyAddWords: { one: "Add 1 word", other: "Add {count} words" },
  applyAddPrompts: { one: "Add 1 prompt", other: "Add {count} prompts" },
  applyAddSentences: { one: "Add 1 sentence", other: "Add {count} sentences" },
  applyReplaceWords: {
    one: "Replace with 1 word",
    other: "Replace with {count} words",
  },
  applyReplacePrompts: {
    one: "Replace with 1 prompt",
    other: "Replace with {count} prompts",
  },
  applyReplaceSentences: {
    one: "Replace with 1 sentence",
    other: "Replace with {count} sentences",
  },
} satisfies Namespace;
