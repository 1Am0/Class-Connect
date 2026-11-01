import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("first-run migration preserves existing teachers and saves the first class atomically", async () => {
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
    ]) {
      const sql = (await readFile(`supabase/migrations/${number}.sql`, "utf8"))
        .replace("create extension if not exists pgcrypto;", "")
        .replace(/alter publication supabase_realtime[^;]+;/g, "");
      await db.exec(sql);
    }
    const old = "11111111-1111-4111-8111-111111111111",
      fresh = "22222222-2222-4222-8222-222222222222";
    await db.query(
      `insert into auth.users(id,email) values($1,'old@example.com')`,
      [old],
    );
    await db.exec(
      await readFile("supabase/migrations/009_first_run_setup.sql", "utf8"),
    );
    await db.query(
      `insert into auth.users(id,email) values($1,'new@example.com')`,
      [fresh],
    );
    const rows = (
      await db.query<{ id: string; onboarding_completed: boolean }>(
        `select id,onboarding_completed from teachers order by id`,
      )
    ).rows;
    assert.equal(
      rows.find((row) => row.id === old)?.onboarding_completed,
      true,
    );
    assert.equal(
      rows.find((row) => row.id === fresh)?.onboarding_completed,
      false,
    );
    await assert.rejects(
      db.query(
        `select complete_first_run($1,'America/Los_Angeles','Design',1,'09:00','08:00',array['monday'])`,
        [fresh],
      ),
    );
    assert.equal(
      (
        await db.query<{ count: string }>(
          `select count(*)::text as count from periods where teacher_id=$1`,
          [fresh],
        )
      ).rows[0].count,
      "0",
    );
    await db.query(
      `select complete_first_run($1,'America/Los_Angeles','Design',1,'08:00','09:00',array['monday','wednesday'])`,
      [fresh],
    );
    const teacher = (
      await db.query<{
        onboarding_completed: boolean;
        weekday_schedule: Record<string, string>;
      }>(
        `select onboarding_completed,weekday_schedule from teachers where id=$1`,
        [fresh],
      )
    ).rows[0];
    assert.equal(teacher.onboarding_completed, true);
    assert.equal(
      teacher.weekday_schedule.monday,
      teacher.weekday_schedule.wednesday,
    );
    await assert.rejects(
      db.query(
        `select complete_first_run($1,'America/Los_Angeles','Second',2,'10:00','11:00',array['friday'])`,
        [fresh],
      ),
    );
    assert.equal(
      (
        await db.query<{ count: string }>(
          `select count(*)::text as count from periods where teacher_id=$1`,
          [fresh],
        )
      ).rows[0].count,
      "1",
    );
  } finally {
    await db.close();
  }
});
