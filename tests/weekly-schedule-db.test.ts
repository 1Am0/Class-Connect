import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("weekday migration preserves legacy times and guards concurrent schedule and scan writes", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
    );
    for (const file of [
      "001_classroom.sql",
      "002_student_data_management.sql",
      "003_bell_schedule.sql",
      "004_class_archive.sql",
      "005_home_preferences.sql",
      "006_overlapping_class_times.sql",
      "007_bulk_roster_import.sql",
    ]) {
      let sql = await readFile(`supabase/migrations/${file}`, "utf8");
      sql = sql
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
    const p1 = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time,time_source) values($1,'Engineering',1,'08:00','09:00','school') returning id`,
        [teacher],
      )
    ).rows[0].id;
    const p2 = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time,time_source) values($1,'Design',2,'09:15','10:00','custom') returning id`,
        [teacher],
      )
    ).rows[0].id;
    const student = (
      await db.query<{ id: string }>(
        `insert into students(teacher_id,first_name,last_name,display_name) values($1,'Test','Student','Test Student') returning id`,
        [teacher],
      )
    ).rows[0].id;
    await db.query(
      `insert into period_students(teacher_id,period_id,student_id) values($1,$2,$4),($1,$3,$4)`,
      [teacher, p1, p2, student],
    );
    await db.query(`select replace_tag($1,$2,'11223344')`, [teacher, student]);
    await db.query(`update teachers set bell_schedule=$2::jsonb where id=$1`, [
      teacher,
      JSON.stringify([
        { period_number: 1, start_time: "08:00", end_time: "09:00" },
      ]),
    ]);
    let migration = await readFile(
      "supabase/migrations/008_weekday_schedules.sql",
      "utf8",
    );
    migration = migration.replace(
      /alter publication supabase_realtime[^;]+;/g,
      "",
    );
    await db.exec(migration);
    const t = (
      await db.query<{
        schedule_presets: {
          id: string;
          name: string;
          periods: { period_number: number }[];
        }[];
        weekday_schedule: Record<string, string>;
        weekly_schedule_version: number;
      }>(
        `select schedule_presets,weekday_schedule,weekly_schedule_version from teachers where id=$1`,
        [teacher],
      )
    ).rows[0];
    assert.equal(t.schedule_presets[0].name, "Current schedule");
    assert.equal(t.schedule_presets[0].periods.length, 2);
    assert.equal(t.weekday_schedule.monday, t.weekday_schedule.friday);
    assert.equal(t.weekly_schedule_version, 1);
    const shortId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const presets = [
      {
        id: shortId,
        name: "Short",
        periods: [{ period_number: 2, start_time: "09:00", end_time: "09:40" }],
      },
    ];
    const assignment = { monday: shortId };
    const save = (owner: string, expected: number, days = assignment) =>
      db.query<{ set_weekly_schedule: number }>(
        `select set_weekly_schedule($1,$2::jsonb,$3::jsonb,$4)`,
        [owner, JSON.stringify(presets), JSON.stringify(days), expected],
      );
    assert.equal((await save(teacher, 1)).rows[0].set_weekly_schedule, 2);
    await assert.rejects(() => save(teacher, 1));
    await db.exec("set role authenticated");
    await assert.rejects(() => save(other, 1));
    await db.exec("reset role");
    await assert.rejects(() =>
      save(teacher, 2, { monday: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" }),
    );
    await assert.rejects(() =>
      db.query(`select set_weekly_schedule($1,$2::jsonb,$3::jsonb,2)`, [
        teacher,
        JSON.stringify([
          {
            id: shortId,
            name: "Invalid",
            periods: [{ period_number: 2, end_time: "09:40" }],
          },
        ]),
        JSON.stringify(assignment),
      ]),
    );
    assert.equal(
      (
        await db.query<{ weekly_schedule_version: number }>(
          `select weekly_schedule_version from teachers where id=$1`,
          [teacher],
        )
      ).rows[0].weekly_schedule_version,
      2,
    );
    await assert.rejects(() =>
      db.query(
        `select write_attendance($1,$2,$3,'2026-10-05','present','rfid','2026-10-05T15:15:00Z','11223344')`,
        [teacher, student, p1],
      ),
    );
    await db.query(
      `select write_attendance($1,$2,$3,'2026-10-05','present','rfid','2026-10-05T16:15:00Z','11223344')`,
      [teacher, student, p2],
    );
    assert.equal(
      (
        await db.query(
          `select * from attendance_records where student_id=$1 and status='present'`,
          [student],
        )
      ).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});
