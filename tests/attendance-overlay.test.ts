import test from "node:test";
import assert from "node:assert/strict";
import { overlayPendingAttendance } from "../lib/attendance-overlay";
import type { Snapshot } from "../types";

test("a pending attendance change remains visible over a refreshed snapshot", () => {
  const snapshot = {
    teacher: { id: "teacher" },
    attendance_sessions: [],
    attendance_records: [],
  } as unknown as Snapshot;
  const operation = {
    teacher_id: "teacher",
    queued_order: 1,
    operation_id: "op",
    period_id: "class",
    student_id: "student",
    date: "2026-10-22",
    at: "2026-10-22T15:00:00Z",
    status: "present",
    action: "manual",
    expected: null,
    state: "pending",
  } as const;
  const visible = overlayPendingAttendance(snapshot, [operation]);
  assert.equal(visible.attendance_records[0].status, "present");
  assert.equal(visible.attendance_sessions[0].period_id, "class");
  assert.equal(snapshot.attendance_records.length, 0);
});

test("a pending note shows without changing the status, and a status change keeps the note", () => {
  const snapshot = {
    teacher: { id: "teacher" },
    attendance_sessions: [
      {
        id: "session",
        teacher_id: "teacher",
        period_id: "class",
        date: "2026-10-22",
        started_at: "2026-10-22T15:00:00Z",
        ended_at: null,
        status: "open",
      },
    ],
    attendance_records: [
      {
        id: "record",
        teacher_id: "teacher",
        attendance_session_id: "session",
        student_id: "student",
        status: "late",
        source: "rfid",
        checked_in_at: "2026-10-22T15:05:00Z",
      },
    ],
  } as unknown as Snapshot;
  const base = {
    teacher_id: "teacher",
    queued_order: 1,
    period_id: "class",
    student_id: "student",
    date: "2026-10-22",
    at: "2026-10-22T15:10:00Z",
    expected: null,
    state: "pending",
  } as const;
  const noted = overlayPendingAttendance(snapshot, [
    {
      ...base,
      operation_id: "n",
      action: "note",
      status: "late",
      note: " Nurse ",
    },
  ]).attendance_records[0];
  assert.equal(noted.note, "Nurse");
  assert.equal(noted.status, "late");
  assert.equal(noted.checked_in_at, "2026-10-22T15:05:00Z");
  const marked = overlayPendingAttendance(
    { ...snapshot, attendance_records: [noted] },
    [{ ...base, operation_id: "m", action: "manual", status: "excused" }],
  ).attendance_records[0];
  assert.equal(marked.status, "excused");
  assert.equal(marked.note, "Nurse");
  const cleared = overlayPendingAttendance(snapshot, [
    { ...base, operation_id: "c", action: "note", status: "late", note: "  " },
  ]).attendance_records[0];
  assert.equal(cleared.note, null);
});
