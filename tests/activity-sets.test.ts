import assert from "node:assert/strict";
import test from "node:test";
import { activitySetInput } from "../lib/activity-sets";

const vocabulary = {
  name: "Unit 1 — Introductions",
  kind: "vocabulary" as const,
  items: [
    {
      id: "e6b92045-b755-4ef9-a67a-f983695070d8",
      text: "hola",
      supporting_text: "hello",
    },
  ],
};

test("a vocabulary set requires paired words and a name", () => {
  assert.equal(activitySetInput.safeParse(vocabulary).success, true);
  assert.equal(
    activitySetInput.safeParse({
      ...vocabulary,
      items: [{ ...vocabulary.items[0], supporting_text: "" }],
    }).success,
    false,
  );
  assert.equal(
    activitySetInput.safeParse({ ...vocabulary, name: " " }).success,
    false,
  );
});

test("a set rejects duplicate item IDs and oversized content", () => {
  assert.equal(
    activitySetInput.safeParse({
      ...vocabulary,
      items: [vocabulary.items[0], vocabulary.items[0]],
    }).success,
    false,
  );
  assert.equal(
    activitySetInput.safeParse({
      ...vocabulary,
      items: [{ ...vocabulary.items[0], text: "x".repeat(501) }],
    }).success,
    false,
  );
});

test("conversation and scramble sets accept optional supporting text", () => {
  for (const kind of ["conversation", "scramble"] as const)
    assert.equal(
      activitySetInput.safeParse({
        ...vocabulary,
        kind,
        items: [{ ...vocabulary.items[0], supporting_text: "" }],
      }).success,
      true,
    );
});

test("sentence alternatives use the same words in another valid order", () => {
  const scramble = {
    ...vocabulary,
    kind: "scramble" as const,
    items: [
      {
        ...vocabulary.items[0],
        text: "I also can go",
        supporting_text: "",
        accepted_answers: ["I can also go"],
      },
    ],
  };
  assert.equal(activitySetInput.safeParse(scramble).success, true);
  assert.equal(
    activitySetInput.safeParse({
      ...scramble,
      items: [{ ...scramble.items[0], accepted_answers: ["I can go"] }],
    }).success,
    false,
  );
});

test("conversation prompts preserve optional teaching cues", () => {
  const input = {
    ...vocabulary,
    kind: "conversation" as const,
    items: [
      {
        ...vocabulary.items[0],
        text: "¿Cómo te llamas?",
        supporting_text: "What is your name?",
        sentence_starter: "Me llamo…",
        follow_up_question: "¿Y tú?",
      },
    ],
  };
  const parsed = activitySetInput.parse(input);
  assert.equal(parsed.items[0].sentence_starter, "Me llamo…");
  assert.equal(parsed.items[0].follow_up_question, "¿Y tú?");
});

test("sentence scramble preserves optional grammar explanation", () => {
  const input = {
    ...vocabulary,
    kind: "scramble" as const,
    items: [
      {
        ...vocabulary.items[0],
        text: "Yo tengo un libro",
        supporting_text: "I have a book",
        grammar_explanation: "The verb follows the subject.",
      },
    ],
  };
  const parsed = activitySetInput.parse(input);
  assert.equal(
    parsed.items[0].grammar_explanation,
    "The verb follows the subject.",
  );
});
