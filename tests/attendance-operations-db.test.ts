import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("queued attendance operations are idempotent, owned, and the browser's change wins", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
    );
    for (const number of [
      "001_classroom",
      "002_student_data_management",
      "003_bell_schedule",
      "004_class_archive",
      "005_home_preferences",
      "006_overlapping_class_times",
      "007_bulk_roster_import",
      "008_weekday_schedules",
      "009_first_run_setup",
      "010_attendance_outbox",
      "011_student_qr_checkin",
      "015_local_changes_win",
      "016_attendance_notes",
    ]) {
      const sql = (await readFile(`supabase/migrations/${number}.sql`, "utf8"))
        .replace("create extension if not exists pgcrypto;", "")
        .replace(/alter publication supabase_realtime[^;]+;/g, "");
      await db.exec(sql);
    }
    const teacher = "11111111-1111-4111-8111-111111111111";
    const other = "22222222-2222-4222-8222-222222222222";
    await db.query(
      `insert into auth.users(id,email) values($1,'one@example.com'),($2,'two@example.com')`,
      [teacher, other],
    );
    const period = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'Design',1,'08:00','09:00') returning id`,
        [teacher],
      )
    ).rows[0].id;
    const student = (
      await db.query<{ id: string }>(
        `insert into students(teacher_id,first_name,last_name,display_name) values($1,'A','B','A B') returning id`,
        [teacher],
      )
    ).rows[0].id;
    await db.query(
      `insert into period_students(teacher_id,period_id,student_id) values($1,$2,$3)`,
      [teacher, period, student],
    );
    const op = {
      operation_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      period_id: period,
      student_id: student,
      date: "2026-10-22",
      at: "2026-10-22T15:00:00Z",
      status: "present",
      action: "manual",
      expected: null,
    };
    const run = (owner: string, value: object) =>
      db.query<{
        apply_attendance_operation: {
          record: {
            id: string;
            status: string;
            source: string;
            checked_in_at: string | null;
          };
          operation_id: string;
        };
      }>(`select apply_attendance_operation($1,$2::jsonb)`, [
        owner,
        JSON.stringify(value),
      ]);
    const first = (await run(teacher, op)).rows[0].apply_attendance_operation;
    assert.equal(first.record.status, "present");
    assert.deepEqual(
      (await run(teacher, op)).rows[0].apply_attendance_operation,
      first,
    );
    await assert.rejects(run(other, op));
    // A stale "expected" no longer blocks the change: the browser wins.
    const second = (
      await run(teacher, {
        ...op,
        operation_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        status: "absent",
      })
    ).rows[0].apply_attendance_operation;
    assert.equal(second.record.status, "absent");
    assert.equal(second.record.checked_in_at, null);
    const tag = (
      await db.query<{ id: string }>(
        `insert into rfid_tags(teacher_id,student_id,uid) values($1,$2,'11223344') returning id`,
        [teacher, student],
      )
    ).rows[0].id;
    const device = (
      await db.query<{ id: string }>(
        `insert into devices(teacher_id,device_name,device_identifier,hashed_api_key) values($1,'Scanner','scanner-1',repeat('a',64)) returning id`,
        [teacher],
      )
    ).rows[0].id;
    const scan = (
      await run(teacher, {
        ...op,
        operation_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        action: "scan",
        tag_id: tag,
        device_id: device,
        expected: second.record,
      })
    ).rows[0].apply_attendance_operation;
    assert.equal(scan.record.source, "rfid");
    assert.equal(scan.record.status, "present");
    const transfer = (
      await db.query<{ id: string }>(
        `insert into students(teacher_id,first_name,last_name,display_name) values($1,'New','Student','New Student') returning id`,
        [teacher],
      )
    ).rows[0].id;
    await db.query(
      `insert into period_students(teacher_id,period_id,student_id) values($1,$2,$3)`,
      [teacher, period, transfer],
    );
    const lateEnrollment = (
      await run(teacher, {
        ...op,
        operation_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        student_id: transfer,
      })
    ).rows[0].apply_attendance_operation;
    assert.equal(lateEnrollment.record.status, "present");
    // A note changes only the note, and a later status change keeps it.
    const noted = (
      await run(teacher, {
        ...op,
        operation_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        student_id: transfer,
        action: "note",
        note: "  Nurse ",
      })
    ).rows[0].apply_attendance_operation as unknown as {
      record: { status: string; checked_in_at: string | null; note: string };
    };
    assert.equal(noted.record.note, "Nurse");
    assert.equal(noted.record.status, "present");
    assert.equal(
      noted.record.checked_in_at,
      lateEnrollment.record.checked_in_at,
    );
    const marked = (
      await run(teacher, {
        ...op,
        operation_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
        student_id: transfer,
        status: "excused",
      })
    ).rows[0].apply_attendance_operation as unknown as {
      record: { status: string; note: string };
    };
    assert.equal(marked.record.status, "excused");
    assert.equal(marked.record.note, "Nurse");
    await assert.rejects(
      run(teacher, {
        ...op,
        operation_id: "abababab-abab-4bab-8bab-abababababab",
        student_id: transfer,
        action: "note",
        note: "x".repeat(201),
      }),
    );
  } finally {
    await db.close();
  }
});
