import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("roster import is atomic and preserves attendance and cards during sync", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`,
    );
    await db.exec(
      (await readFile("supabase/migrations/001_classroom.sql", "utf8"))
        .replace("create extension if not exists pgcrypto;", "")
        .replace(/alter publication supabase_realtime[^;]+;/g, ""),
    );
    await db.exec(
      await readFile("supabase/migrations/007_bulk_roster_import.sql", "utf8"),
    );
    const teacher = "11111111-1111-4111-8111-111111111111";
    const other = "22222222-2222-4222-8222-222222222222";
    await db.query(
      `insert into auth.users(id,email) values($1,'one@example.com'),($2,'two@example.com')`,
      [teacher, other],
    );
    const period = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'Engineering',1,'09:00','10:00') returning id`,
        [teacher],
      )
    ).rows[0].id;
    const old = (
      await db.query<{ id: string }>(
        `insert into students(teacher_id,first_name,last_name,display_name,school_student_id) values($1,'Ada','Lovelace','Ada Lovelace','0001') returning id`,
        [teacher],
      )
    ).rows[0].id;
    await db.query(
      `insert into period_students(teacher_id,period_id,student_id) values($1,$2,$3)`,
      [teacher, period, old],
    );
    await db.query(`select replace_tag($1,$2,'11223344')`, [teacher, old]);
    await db.query(
      `select write_attendance($1,$2,$3,'2026-09-14','present','manual','2026-09-14T16:00:00Z',null)`,
      [teacher, old, period],
    );
    const apply = (
      rows: object[],
      expected: string[],
      mode = "sync",
      owner = teacher,
      classId = period,
    ) =>
      db.query<{ result: { added: number; removed: number } }>(
        `select import_class_roster($1,$2,$3,$4::jsonb,$5::uuid[]) as result`,
        [owner, classId, mode, JSON.stringify(rows), expected],
      );
    const result = (
      await apply(
        [
          {
            first_name: "Grace",
            last_name: "Hopper",
            school_student_id: "0002",
            existing_student_id: null,
          },
        ],
        [old],
      )
    ).rows[0].result;
    assert.equal(result.added, 1);
    assert.equal(result.removed, 1);
    assert.equal(
      (
        await db.query(`select * from attendance_records where student_id=$1`, [
          old,
        ])
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          `select * from rfid_tags where student_id=$1 and active`,
          [old],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (await db.query(`select * from students where id=$1`, [old])).rows.length,
      1,
    );
    const secondPeriod = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'Design',2,'10:00','11:00') returning id`,
        [teacher],
      )
    ).rows[0].id;
    const transfer = (
      await apply(
        [
          {
            first_name: "Ada",
            last_name: "Lovelace",
            school_student_id: "0001",
            existing_student_id: old,
          },
        ],
        [],
        "add",
        teacher,
        secondPeriod,
      )
    ).rows[0].result;
    assert.equal(transfer.added, 0);
    assert.equal(
      (
        await db.query(
          `select * from period_students where period_id=$1 and student_id=$2`,
          [secondPeriod, old],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          `select * from rfid_tags where student_id=$1 and active`,
          [old],
        )
      ).rows.length,
      1,
    );
    await assert.rejects(() =>
      apply(
        [
          {
            first_name: "Wrong",
            last_name: "Teacher",
            school_student_id: null,
            existing_student_id: null,
          },
        ],
        [],
        "add",
        other,
      ),
    );
    await assert.rejects(() =>
      apply(
        [
          {
            first_name: "New",
            last_name: "One",
            school_student_id: "0003",
            existing_student_id: null,
          },
        ],
        [old],
        "add",
      ),
    );
    assert.equal(
      (
        await db.query<{ count: number }>(
          `select count(*)::int as count from students where teacher_id=$1`,
          [teacher],
        )
      ).rows[0].count,
      2,
    );
    const currentIds = (
      await db.query<{ student_id: string }>(
        `select student_id from period_students where period_id=$1`,
        [period],
      )
    ).rows.map((r) => r.student_id);
    await assert.rejects(() =>
      apply(
        [
          {
            first_name: "First",
            last_name: "New",
            school_student_id: "0003",
            existing_student_id: null,
          },
          {
            first_name: "Second",
            last_name: "New",
            school_student_id: "0002",
            existing_student_id: null,
          },
        ],
        currentIds,
        "add",
      ),
    );
    assert.equal(
      (
        await db.query<{ count: number }>(
          `select count(*)::int as count from students where teacher_id=$1`,
          [teacher],
        )
      ).rows[0].count,
      2,
    );
  } finally {
    await db.close();
  }
});
