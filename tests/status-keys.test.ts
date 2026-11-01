import { test } from "node:test";
import assert from "node:assert/strict";
import { statusKeyTarget } from "../lib/status-keys";

test("arrow keys move between the four statuses and wrap", () => {
  assert.equal(statusKeyTarget("ArrowRight", 0, 4), 1);
  assert.equal(statusKeyTarget("ArrowDown", 3, 4), 0);
  assert.equal(statusKeyTarget("ArrowLeft", 0, 4), 3);
  assert.equal(statusKeyTarget("ArrowUp", 2, 4), 1);
});

test("Home and End jump to the ends", () => {
  assert.equal(statusKeyTarget("Home", 2, 4), 0);
  assert.equal(statusKeyTarget("End", 0, 4), 3);
});

test("other keys don't move focus", () => {
  for (const key of ["Enter", " ", "Tab", "a"])
    assert.equal(statusKeyTarget(key, 1, 4), null);
});

test("with shortcuts on, up and down are left for moving between students", () => {
  assert.equal(statusKeyTarget("ArrowDown", 1, 4, false), null);
  assert.equal(statusKeyTarget("ArrowUp", 1, 4, false), null);
  assert.equal(statusKeyTarget("ArrowRight", 1, 4, false), 2);
});
