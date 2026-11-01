import { test } from "node:test";
import assert from "node:assert/strict";
import { activitySetInput } from "../lib/activity-sets";
import {
  sampleActivitySets,
  withSampleSets,
} from "../lib/sample-activity-sets";

test("every sample set passes the same rules as teacher sets", () => {
  for (const set of sampleActivitySets) {
    const result = activitySetInput.safeParse(set);
    assert.ok(result.success, `${set.name}: ${JSON.stringify(result.error)}`);
  }
});

test("there is one sample for each activity kind", () => {
  assert.deepEqual(sampleActivitySets.map((set) => set.kind).sort(), [
    "conversation",
    "scramble",
    "vocabulary",
  ]);
});

test("sample ids are unique and never collide with item ids", () => {
  const ids = sampleActivitySets.flatMap((set) => [
    set.id,
    ...set.items.map((item) => item.id),
  ]);
  assert.equal(new Set(ids).size, ids.length);
});

test("teacher sets are listed before samples", () => {
  const own = { ...sampleActivitySets[0], id: "own", teacher_id: "t1" };
  assert.equal(withSampleSets([own])[0].id, "own");
  assert.equal(withSampleSets(undefined).length, sampleActivitySets.length);
});
