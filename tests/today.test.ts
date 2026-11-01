import { test } from "node:test";
import assert from "node:assert/strict";
import { todaySchedule } from "../lib/today";
import { demoSeed } from "../lib/demo-seed";

// Demo classes meet 7:30, 8:30, and 9:30 in Los Angeles on weekdays.
const timings = (now: Date) => {
  const s = demoSeed();
  return todaySchedule(s.teacher, s.periods, now).map((row) => [
    row.period.period_number,
    row.timing,
  ]);
};

test("labels done, now, and next classes from the school clock", () => {
  // Monday 8:45 AM in Los Angeles.
  assert.deepEqual(timings(new Date("2026-09-14T15:45:00Z")), [
    [1, "done"],
    [2, "now"],
    [3, "next"],
  ]);
});

test("only the first upcoming class is next", () => {
  // Monday 7:00 AM: nothing has started yet.
  assert.deepEqual(timings(new Date("2026-09-14T14:00:00Z")), [
    [1, "next"],
    [2, "later"],
    [3, "later"],
  ]);
});

test("classes without a meeting today are listed as off", () => {
  // Saturday: the weekly schedule has no preset.
  assert.deepEqual(timings(new Date("2026-09-19T16:00:00Z")), [
    [1, "off"],
    [2, "off"],
    [3, "off"],
  ]);
});

test("archived classes are left out", () => {
  const s = demoSeed();
  s.periods[0].active = false;
  const rows = todaySchedule(
    s.teacher,
    s.periods,
    new Date("2026-09-14T15:45:00Z"),
  );
  assert.deepEqual(
    rows.map((row) => row.period.period_number),
    [2, 3],
  );
});
