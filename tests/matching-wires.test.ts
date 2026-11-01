import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseMatchingEndpoint,
  matchingWireColor,
  matchingWirePath,
} from "../lib/matching-wires";

test("each visible matching pair receives a distinct wire color", () => {
  const colors = Array.from({ length: 12 }, (_, index) =>
    matchingWireColor(index),
  );
  assert.equal(new Set(colors).size, 12);
});

test("a wire curves between the chosen word and meaning positions", () => {
  assert.equal(
    matchingWirePath({ x: 10, y: 20 }, { x: 90, y: 80 }),
    "M 10 20 C 38 20, 62 80, 90 80",
  );
});

test("matching can start on either side and wrong attempts preserve the loose end", () => {
  const meaning = { side: "meaning" as const, id: "a" };
  const word = { side: "word" as const, id: "a" };
  assert.deepEqual(chooseMatchingEndpoint(null, meaning), {
    selected: meaning,
    matchedId: null,
  });
  assert.deepEqual(chooseMatchingEndpoint(meaning, { side: "word", id: "b" }), {
    selected: meaning,
    matchedId: null,
  });
  assert.deepEqual(chooseMatchingEndpoint(meaning, word), {
    selected: null,
    matchedId: "a",
  });
  assert.deepEqual(chooseMatchingEndpoint(word, meaning), {
    selected: null,
    matchedId: "a",
  });
});
