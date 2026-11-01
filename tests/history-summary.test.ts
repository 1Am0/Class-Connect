import assert from "node:assert/strict";
import test from "node:test";
import {
  attendanceRate,
  historySummary,
  statusRate,
} from "../lib/history-summary";
import type { Attendance, Session } from "../types";

const session = (id: string, period_id: string, date: string) =>
  ({ id, period_id, date }) as Session;
const record = (attendance_session_id: string, status: Attendance["status"]) =>
  ({ attendance_session_id, status }) as Attendance;

test("history totals include only the selected class and date range", () => {
  const summary = historySummary(
    {
      attendance_sessions: [
        session("a", "class-a", "2026-10-05"),
        session("b", "class-a", "2026-10-06"),
        session("c", "class-a", "2026-09-30"),
        session("d", "class-b", "2026-10-05"),
      ],
      attendance_records: [
        record("a", "present"),
        record("a", "late"),
        record("a", "absent"),
        record("a", "excused"),
        record("b", "absent"),
        record("c", "present"),
        record("d", "present"),
      ],
    },
    "class-a",
    "2026-10-01",
    "2026-10-31",
  );
  assert.equal(summary.total.records, 5);
  assert.equal(summary.total.sessions, 2);
  assert.deepEqual(Object.keys(summary.days).sort(), [
    "2026-10-05",
    "2026-10-06",
  ]);
  assert.equal(attendanceRate(summary.total), 40);
  assert.equal(statusRate(summary.total, "absent"), 40);
  assert.equal(attendanceRate(summary.days["2026-10-06"]), 0);
});

test("missing sessions and empty sessions do not become absent days", () => {
  const summary = historySummary(
    {
      attendance_sessions: [session("empty", "class-a", "2026-10-05")],
      attendance_records: [],
    },
    "class-a",
    "2026-10-01",
    "2026-10-31",
  );
  assert.equal(summary.days["2026-10-06"], undefined);
  assert.equal(summary.days["2026-10-05"].sessions, 1);
  assert.equal(summary.total.absent, 0);
  assert.equal(attendanceRate(summary.total), null);
  assert.equal(statusRate(summary.total, "absent"), null);
});
