import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addCalendarDays,
  calendarDate,
  calendarGrid,
  calendarMonth,
  parseCalendarDate,
  shiftCalendarMonth,
} from "../lib/calendar";

test("calendar keeps ISO dates stable across month and year boundaries", () => {
  assert.equal(
    calendarDate(addCalendarDays(parseCalendarDate("2024-02-29"), 1)),
    "2024-03-01",
  );
  assert.equal(
    calendarDate(addCalendarDays(parseCalendarDate("2026-01-01"), -1)),
    "2025-12-31",
  );
  assert.equal(
    calendarDate(shiftCalendarMonth(parseCalendarDate("2026-01-31"), 1)),
    "2026-02-28",
  );
  assert.throws(() => parseCalendarDate("2026-02-29"));
});

test("calendar grid includes complete weeks around the selected month", () => {
  const days = calendarGrid(calendarMonth("2026-10-01"));
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 0);
  assert.equal(calendarDate(days[0]), "2026-09-27");
  assert.equal(calendarDate(days[41]), "2026-11-07");
});
