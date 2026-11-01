import { test } from "node:test";
import assert from "node:assert/strict";
import { rosterShortcut } from "../lib/roster-shortcuts";

const ids = ["a", "b", "c"];

test("up and down move between students and stop at the ends", () => {
  assert.deepEqual(rosterShortcut("ArrowDown", ids, null), {
    kind: "move",
    studentId: "a",
  });
  assert.deepEqual(rosterShortcut("j", ids, "a"), {
    kind: "move",
    studentId: "b",
  });
  assert.deepEqual(rosterShortcut("ArrowDown", ids, "c"), {
    kind: "move",
    studentId: "c",
  });
  assert.deepEqual(rosterShortcut("k", ids, "b"), {
    kind: "move",
    studentId: "a",
  });
  assert.deepEqual(rosterShortcut("ArrowUp", ids, "a"), {
    kind: "move",
    studentId: "a",
  });
});

test("P A L E mark the current student and move on", () => {
  assert.deepEqual(rosterShortcut("p", ids, null), {
    kind: "mark",
    studentId: "a",
    status: "present",
    next: "b",
  });
  assert.deepEqual(rosterShortcut("L", ids, "b"), {
    kind: "mark",
    studentId: "b",
    status: "late",
    next: "c",
  });
  assert.deepEqual(rosterShortcut("e", ids, "c"), {
    kind: "mark",
    studentId: "c",
    status: "excused",
    next: null,
  });
  assert.equal(
    (rosterShortcut("a", ids, "a") as { status: string }).status,
    "absent",
  );
});

test("a student hidden by search starts again from the top", () => {
  assert.deepEqual(rosterShortcut("p", ids, "gone"), {
    kind: "mark",
    studentId: "a",
    status: "present",
    next: "b",
  });
});

test("N notes, / searches, Escape lets go, other keys do nothing", () => {
  assert.deepEqual(rosterShortcut("n", ids, "b"), {
    kind: "note",
    studentId: "b",
  });
  assert.deepEqual(rosterShortcut("/", [], null), { kind: "search" });
  assert.deepEqual(rosterShortcut("Escape", ids, "b"), { kind: "clear" });
  assert.equal(rosterShortcut("Escape", ids, null), null);
  for (const key of ["x", "Enter", "Tab", "ArrowLeft", "Pause"])
    assert.equal(rosterShortcut(key, ids, "a"), null);
  assert.equal(rosterShortcut("p", [], null), null);
});
