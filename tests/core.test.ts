import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activePeriod,
  normalizeUid,
  schoolClock,
  makeGroups,
  presentStudents,
  processScan,
  recordsFor,
  type ScanStore,
} from "../lib/core";
import { demoSeed } from "../lib/demo-seed";
import { ensureDemoSession } from "../lib/server/demo-session";
import type { Attendance, Snapshot } from "../types";
function fixture() {
  const s = demoSeed();
  s.attendance_records = [];
  s.attendance_sessions = [];
  const p = s.periods[2];
  const now = new Date("2026-09-14T16:45:00Z");
  const store: ScanStore = {
    async snapshot() {
      return s;
    },
    async touch(id, at, uid) {
      const d = s.devices.find((d) => d.id === id)!;
      d.last_seen_at = at;
      if (uid) d.pending_uid = uid;
    },
    async checkIn(studentId, periodId, date, uid, at) {
      const session = ensureDemoSession(s, periodId, date, at);
      let record = s.attendance_records.find(
        (r) =>
          r.attendance_session_id === session.id && r.student_id === studentId,
      );
      if (record?.status === "present" || record?.status === "late")
        return { record, created: false };
      record!.status = "present";
      record!.source = "rfid";
      record!.checked_in_at = at;
      return { record: record!, created: true };
    },
  };
  return { s, p, store, now, uid: s.rfid_tags[0].uid, device: s.devices[0].id };
}
test("UID normalization and invalid input", () => {
  assert.equal(normalizeUid("04:a7-31 8c 92 66 80"), "04A7318C926680");
  assert.throws(() => normalizeUid("not a tag"));
  assert.throws(() => normalizeUid("ABC"));
});
test("automatic schedule includes start, excludes end and gaps", () => {
  const { s } = fixture();
  s.teacher.override_period_id = null;
  assert.equal(
    activePeriod(s.teacher, s.periods, new Date("2026-09-14T14:30:00Z"))
      ?.period_number,
    1,
  );
  assert.equal(
    activePeriod(s.teacher, s.periods, new Date("2026-09-14T15:25:00Z")),
    undefined,
  );
  assert.equal(
    activePeriod(s.teacher, s.periods, new Date("2026-09-14T16:45:00Z"))
      ?.period_number,
    3,
  );
});
test("manual override wins and inactive override never receives scans", () => {
  const { s } = fixture();
  s.teacher.override_period_id = s.periods[1].id;
  assert.equal(
    activePeriod(s.teacher, s.periods, new Date("2026-09-14T14:30:00Z"))
      ?.period_number,
    2,
  );
  s.periods[1].active = false;
  assert.equal(activePeriod(s.teacher, s.periods), undefined);
});
test("overlapping classes route scans to the lowest period unless a class is selected", () => {
  const { s } = fixture();
  s.teacher.override_period_id = null;
  s.periods[1].start_time = s.periods[0].start_time;
  s.periods[1].end_time = s.periods[0].end_time;
  const now = new Date("2026-09-14T14:30:00Z");
  assert.equal(
    activePeriod(s.teacher, [...s.periods].reverse(), now)?.id,
    s.periods[0].id,
  );
  s.teacher.override_period_id = s.periods[1].id;
  assert.equal(activePeriod(s.teacher, s.periods, now)?.id, s.periods[1].id);
});
test("school dates respect timezone at UTC midnight", () => {
  assert.equal(
    schoolClock("America/Los_Angeles", new Date("2026-09-15T01:00:00Z")).date,
    "2026-09-14",
  );
});
test("correct scan checks in exactly once and retains first timestamp", async () => {
  const { s, store, now, uid, device, p } = fixture();
  assert.equal(
    (await processScan(store, device, uid, now)).status,
    "checked_in",
  );
  assert.equal(
    (await processScan(store, device, uid, new Date(now.getTime() + 2000)))
      .status,
    "already_checked_in",
  );
  const r = recordsFor(s, p.id, "2026-09-14").filter(
    (r) => r.student_id === s.students[0].id,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].checked_in_at, now.toISOString());
});
test("unknown tag, wrong period and unauthorized scanner", async () => {
  const { s, store, now, uid, device } = fixture();
  assert.equal(
    (await processScan(store, device, "FFFFFFFF", now)).status,
    "unknown_tag",
  );
  s.period_students = s.period_students.filter(
    (m) => m.student_id !== s.students[0].id,
  );
  assert.equal(
    (await processScan(store, device, uid, now)).status,
    "wrong_period",
  );
  assert.equal(
    (await processScan(store, "invalid", uid, now)).status,
    "unauthorized_device",
  );
});
test("no active period is explicit", async () => {
  const { s, store, uid, device } = fixture();
  s.teacher.override_period_id = null;
  assert.equal(
    (await processScan(store, device, uid, new Date("2026-09-14T23:00:00Z")))
      .status,
    "no_active_period",
  );
});
test("manual present followed by scan retains manual record", async () => {
  const { s, p, store, now, uid, device } = fixture();
  const session = ensureDemoSession(s, p.id, "2026-09-14", now.toISOString());
  const record = s.attendance_records.find(
    (r) => r.student_id === s.students[0].id,
  )!;
  record.status = "present";
  record.source = "manual";
  record.checked_in_at = now.toISOString();
  assert.equal(
    (await processScan(store, device, uid, now)).status,
    "already_checked_in",
  );
  assert.equal(record.source, "manual");
  assert.equal(s.attendance_sessions.length, 1);
});
test("deactivated tags and deactivated students are rejected", async () => {
  const { s, store, now, uid, device } = fixture();
  s.rfid_tags[0].active = false;
  assert.equal(
    (await processScan(store, device, uid, now)).status,
    "unknown_tag",
  );
  s.rfid_tags[0].active = true;
  s.students[0].active = false;
  assert.equal(
    (await processScan(store, device, uid, now)).status,
    "unknown_tag",
  );
});
test("enrollment captures unknown UID without attendance and expires", async () => {
  const { s, store, now, device } = fixture();
  s.devices[0].enrollment_until = new Date(now.getTime() + 60000).toISOString();
  assert.equal(
    (await processScan(store, device, "11223344", now)).status,
    "enrollment_detected",
  );
  assert.equal(s.devices[0].pending_uid, "11223344");
  assert.equal(s.attendance_records.length, 0);
  assert.equal(
    (
      await processScan(
        store,
        device,
        "11223344",
        new Date(now.getTime() + 61000),
      )
    ).status,
    "unknown_tag",
  );
});
test("next day begins absent and history roster survives removal", async () => {
  const { s, p, store, now, uid, device } = fixture();
  await processScan(store, device, uid, now);
  const oldCount = s.attendance_records.length;
  s.period_students = s.period_students.filter(
    (m) => m.student_id !== s.students[0].id,
  );
  ensureDemoSession(s, p.id, "2026-09-15", now.toISOString());
  assert.equal(recordsFor(s, p.id, "2026-09-14").length, oldCount);
  assert.ok(
    recordsFor(s, p.id, "2026-09-15").every((r) => r.status === "absent"),
  );
});
test("only present students enter classroom tools", () => {
  const { s } = fixture();
  const records = s.students.slice(0, 4).map((st, i) => ({
    student_id: st.id,
    status: ["present", "absent", "late", "excused"][i],
  })) as Attendance[];
  assert.deepEqual(
    presentStudents(s.students, records).map((st) => st.id),
    [s.students[0].id],
  );
});
test("uneven groups cover each student once and differ by at most one", () => {
  for (const count of [1, 2, 7, 29, 31])
    for (const mode of ["count", "size"] as const) {
      const input = Array.from({ length: count }, (_, i) => i);
      const groups = makeGroups(input, 6, mode, () => 0.4);
      assert.deepEqual(
        groups.flat().sort((a, b) => a - b),
        input,
      );
      assert.ok(
        Math.max(...groups.map((g) => g.length)) -
          Math.min(...groups.map((g) => g.length)) <=
          1,
      );
      if (mode === "size") assert.ok(groups.every((g) => g.length <= 6));
    }
  assert.deepEqual(makeGroups([], 4, "count"), []);
  assert.throws(() => makeGroups([1, 2], 0, "count"));
});
