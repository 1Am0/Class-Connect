import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTimeInput } from "../lib/time-input";

test("typed school times normalize to the existing 24-hour format", () => {
  assert.equal(normalizeTimeInput("8:45 AM"), "08:45");
  assert.equal(normalizeTimeInput("1:30 pm"), "13:30");
  assert.equal(normalizeTimeInput("12:00 AM"), "00:00");
  assert.equal(normalizeTimeInput("12:00 PM"), "12:00");
  assert.equal(normalizeTimeInput("13:30"), "13:30");
  assert.equal(normalizeTimeInput(" 9:16 "), "09:16");
  assert.equal(normalizeTimeInput("9am"), "09:00");
  assert.equal(normalizeTimeInput("9 a.m."), "09:00");
  assert.equal(normalizeTimeInput("3pm"), "15:00");
  assert.equal(normalizeTimeInput("3 p.m."), "15:00");
  assert.equal(normalizeTimeInput("12am"), "00:00");
  assert.equal(normalizeTimeInput("12 PM"), "12:00");
  assert.equal(normalizeTimeInput("9:30 a.m."), "09:30");
});

test("invalid typed times are not converted", () => {
  for (const value of [
    "",
    "9",
    "9 a",
    "25:00",
    "13:00 PM",
    "0am",
    "13pm",
    "9:60",
    "9:60am",
    "banana",
  ]) {
    assert.equal(normalizeTimeInput(value), null);
  }
});
