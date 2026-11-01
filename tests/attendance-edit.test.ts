import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Store } from "../lib/server/store";
import { demoTransaction } from "../lib/server/demo";
import { sameAttendance } from "../lib/attendance-edit";

test("attendance edits restore exact records and the teacher's change wins over newer saved values", async () => {
  const cwd = process.cwd();
  const directory = await mkdtemp(path.join(os.tmpdir(), "classroom-edit-"));
  const previousDemo = process.env.DEMO_MODE;
  process.env.DEMO_MODE = "true";
  process.chdir(directory);
  try {
    const state = await demoTransaction((s) => structuredClone(s));
    const period = state.periods.find(
      (p) => p.id === state.teacher.override_period_id,
    )!;
    const student = state.students.find(
      (st) =>
        st.active &&
        state.period_students.some(
          (m) => m.period_id === period.id && m.student_id === st.id,
        ),
    )!;
    const store = new Store(state.teacher.id);
    const first = await store.editAttendance(
      student.id,
      period.id,
      "2026-10-01",
      "present",
    );
    assert.equal(first.before.status, "absent");
    assert.equal(first.record.status, "present");
    assert.ok(first.record.checked_in_at);
    const unchanged = await store.editAttendance(
      student.id,
      period.id,
      "2026-10-01",
      "present",
    );
    assert.deepEqual(unchanged.record, first.record);
    const correction = await store.editAttendance(
      student.id,
      period.id,
      "2026-10-01",
      "excused",
    );
    assert.equal(correction.record.checked_in_at, null);
    const restored = await store.editAttendance(
      student.id,
      period.id,
      "2026-10-01",
      "present",
      {
        status: correction.before.status,
        source: correction.before.source,
        checked_in_at: correction.before.checked_in_at,
      },
    );
    assert.deepEqual(restored.record, first.record);
    // A newer scanner check-in saved elsewhere does not block the teacher.
    await demoTransaction((s) => {
      const row = s.attendance_records.find(
        (r) => r.id === restored.record.id,
      )!;
      row.status = "present";
      row.source = "rfid";
      row.checked_in_at = "2026-10-01T16:40:00Z";
    });
    const teacherWins = await store.editAttendance(
      student.id,
      period.id,
      "2026-10-01",
      "absent",
    );
    assert.equal(teacherWins.before.source, "rfid");
    assert.equal(teacherWins.record.status, "absent");
    assert.equal(teacherWins.record.checked_in_at, null);
    const after = await demoTransaction((s) =>
      s.attendance_records.find((r) => r.id === restored.record.id)!,
    );
    assert.equal(after.status, "absent");
    const scanned = {
      ...after,
      status: "present" as const,
      source: "rfid" as const,
      checked_in_at: "2026-10-01T16:40:00Z",
    };
    assert.ok(
      sameAttendance(scanned, {
        ...scanned,
        checked_in_at: "2026-10-01T16:40:00.000+00:00",
      }),
    );
    assert.equal(
      sameAttendance(scanned, { ...scanned, id: "different-record" }),
      false,
    );
    assert.equal(
      sameAttendance(scanned, {
        ...scanned,
        checked_in_at: "2026-10-01T16:41:00Z",
      }),
      false,
    );
  } finally {
    process.chdir(cwd);
    if (previousDemo === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = previousDemo;
    await rm(directory, { recursive: true, force: true });
  }
});
