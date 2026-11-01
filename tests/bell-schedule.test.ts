import { test } from "node:test";
import assert from "node:assert/strict";
import { bellScheduleError, bellTimeFor } from "../lib/bell-schedule";

test("bell times are selected by period and adjacent periods are valid", () => {
  const schedule = [
    { period_number: 2, start_time: "09:16", end_time: "10:04" },
    { period_number: 1, start_time: "08:45", end_time: "09:16" },
  ];
  assert.equal(bellScheduleError(schedule), null);
  assert.deepEqual(bellTimeFor(schedule, 2), schedule[0]);
  assert.equal(bellTimeFor(schedule, 3), undefined);
});

test("bell schedule rejects duplicate and reversed times but allows overlaps", () => {
  const first = { period_number: 1, start_time: "08:45", end_time: "09:10" };
  assert.match(
    bellScheduleError([first, { ...first }]) ?? "",
    /appears more than once/,
  );
  assert.match(
    bellScheduleError([
      { period_number: 2, start_time: "10:04", end_time: "09:16" },
    ]) ?? "",
    /valid start and end/,
  );
  assert.equal(
    bellScheduleError([
      first,
      { period_number: 2, start_time: "09:00", end_time: "10:04" },
    ]),
    null,
  );
});
