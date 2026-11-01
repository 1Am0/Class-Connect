import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("archiving keeps history, clears scanner routing, and allows period reuse", async () => {
  const db = new PGlite();
  const teacher = "11111111-1111-4111-8111-111111111111";
  const otherTeacher = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$; grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
    );
    for (const filename of [
      "001_classroom.sql",
      "003_bell_schedule.sql",
      "004_class_archive.sql",
      "006_overlapping_class_times.sql",
    ]) {
      let sql = await readFile(`supabase/migrations/${filename}`, "utf8");
      sql = sql
        .replace("create extension if not exists pgcrypto;", "")
        .replace(/alter publication supabase_realtime[^;]+;/g, "");
      await db.exec(sql);
    }
    await db.query(
      `insert into auth.users(id,email) values($1,'one@example.com'),($2,'two@example.com')`,
      [teacher, otherTeacher],
    );
    const original = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time,time_source) values($1,'Original',1,'08:45','09:30','school') returning id`,
        [teacher],
      )
    ).rows[0].id;
    const otherClass = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'Other teacher',1,'08:45','09:30') returning id`,
        [otherTeacher],
      )
    ).rows[0].id;
    const student = (
      await db.query<{ id: string }>(
        `insert into students(teacher_id,first_name,last_name,display_name) values($1,'Test','Student','Test Student') returning id`,
        [teacher],
      )
    ).rows[0].id;
    await db.query(
      `insert into period_students(teacher_id,period_id,student_id) values($1,$2,$3)`,
      [teacher, original, student],
    );
    await db.query(`select replace_tag($1,$2,'04A70000')`, [teacher, student]);
    await db.query(
      `select write_attendance($1,$2,$3,'2026-09-14','present','rfid','2026-09-14T16:45:00Z','04A70000')`,
      [teacher, student, original],
    );
    await db.query(`update teachers set override_period_id=$2 where id=$1`, [
      teacher,
      original,
    ]);

    const archived = await db.query<{ reset: boolean }>(
      `select set_class_active($1,$2,false) as reset`,
      [teacher, original],
    );
    assert.equal(archived.rows[0].reset, true);
    const state = await db.query<{
      active: boolean;
      override_period_id: string | null;
    }>(
      `select p.active,t.override_period_id from periods p join teachers t on t.id=p.teacher_id where p.id=$1`,
      [original],
    );
    assert.equal(state.rows[0].active, false);
    assert.equal(state.rows[0].override_period_id, null);
    await db.query(`select set_bell_schedule($1,$2::jsonb,true)`, [
      teacher,
      JSON.stringify([
        { period_number: 1, start_time: "07:30", end_time: "08:20" },
      ]),
    ]);
    assert.equal(
      (
        await db.query<{ start_time: string }>(
          `select start_time from periods where id=$1`,
          [original],
        )
      ).rows[0].start_time,
      "08:45:00",
    );
    assert.equal(
      (
        await db.query<{ count: number }>(
          `select count(*)::int as count from attendance_sessions where period_id=$1`,
          [original],
        )
      ).rows[0].count,
      1,
    );
    assert.equal(
      (
        await db.query<{ count: number }>(
          `select count(*)::int as count from period_students where period_id=$1`,
          [original],
        )
      ).rows[0].count,
      1,
    );
    await assert.rejects(() =>
      db.query(
        `select write_attendance($1,$2,$3,'2026-09-15','present','rfid','2026-09-15T16:45:00Z','04A70000')`,
        [teacher, student, original],
      ),
    );
    await db.query(
      `select write_attendance($1,$2,$3,'2026-09-14','excused','manual','2026-09-14T16:46:00Z',null)`,
      [teacher, student, original],
    );
    const replacement = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'New year',1,'08:45','09:30') returning id`,
        [teacher],
      )
    ).rows[0].id;
    await assert.rejects(() =>
      db.query(`select set_class_active($1,$2,true)`, [teacher, original]),
    );
    await assert.rejects(() =>
      db.query(`select set_class_active($1,$2,false)`, [
        otherTeacher,
        original,
      ]),
    );
    await db.query(`select set_class_active($1,$2,false)`, [
      teacher,
      replacement,
    ]);
    await db.query(`select set_class_active($1,$2,true)`, [teacher, original]);
    const overlapping = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'Concurrent class',2,'09:00','10:00') returning id`,
        [teacher],
      )
    ).rows[0].id;
    await db.query(`select set_class_active($1,$2,false)`, [
      teacher,
      overlapping,
    ]);
    await db.query(`select set_class_active($1,$2,true)`, [
      teacher,
      overlapping,
    ]);
    assert.equal(
      (
        await db.query<{ active: boolean }>(
          `select active from periods where id=$1`,
          [overlapping],
        )
      ).rows[0].active,
      true,
    );
    assert.equal(
      (
        await db.query<{ active: boolean }>(
          `select active from periods where id=$1`,
          [otherClass],
        )
      ).rows[0].active,
      true,
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          `select status from attendance_records where student_id=$1`,
          [student],
        )
      ).rows[0].status,
      "excused",
    );
  } finally {
    await db.close();
  }
});
