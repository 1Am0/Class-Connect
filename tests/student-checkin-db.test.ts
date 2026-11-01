import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("QR check-in is idempotent and cannot cross teacher or class boundaries", async () => {
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
    const legacy = (
      await db.query<{ id: string }>(
        `insert into students(teacher_id,first_name,last_name,display_name,school_student_id) values($1,'Legacy','Student','Legacy Student','003421') returning id`,
        [teacher],
      )
    ).rows[0].id;
    const backfill = await readFile(
      "supabase/migrations/012_school_student_ids.sql",
      "utf8",
    );
    const emailOf = async (id: string) =>
      (
        await db.query<{ school_email: string | null }>(
          `select school_email from students where id=$1`,
          [id],
        )
      ).rows[0].school_email;
    // Without the domain setting, the backfill changes nothing.
    await db.exec(backfill);
    assert.equal(await emailOf(legacy), null);
    await db.exec(
      `set app.student_email_domain = ' Students.Example.EDU '; ${backfill}`,
    );
    assert.equal(await emailOf(legacy), "003421@students.example.edu");
    const period = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'Design',1,'08:00','09:00') returning id`,
        [teacher],
      )
    ).rows[0].id;
    const student = (
      await db.query<{ id: string }>(
        `insert into students(teacher_id,first_name,last_name,display_name,school_email) values($1,'A','B','A B','a@school.edu') returning id`,
        [teacher],
      )
    ).rows[0].id;
    await db.query(
      `insert into period_students(teacher_id,period_id,student_id) values($1,$2,$3)`,
      [teacher, period, student],
    );
    const run = (owner: string, classId = period, studentId = student) =>
      db.query<{
        qr_student_checkin: {
          record: { id: string; status: string; source: string };
          already_checked_in: boolean;
        };
      }>(
        `select qr_student_checkin($1,$2,$3,'2026-10-23','2026-10-23T15:30:00Z')`,
        [owner, classId, studentId],
      );
    const first = (await run(teacher)).rows[0].qr_student_checkin;
    assert.equal(first.record.status, "present");
    assert.equal(first.record.source, "qr");
    assert.equal(first.already_checked_in, false);
    const repeat = (await run(teacher)).rows[0].qr_student_checkin;
    assert.equal(repeat.record.id, first.record.id);
    assert.equal(repeat.already_checked_in, true);
    await db.query(
      `update attendance_records set status='excused',source='manual',checked_in_at=null where id=$1`,
      [first.record.id],
    );
    const excused = (await run(teacher)).rows[0].qr_student_checkin;
    assert.equal(excused.record.status, "excused");
    assert.equal(excused.already_checked_in, true);
    await assert.rejects(run(other));
    await assert.rejects(run(teacher, other));
    const imported = await db.query<{ result: { added: number } }>(
      `select import_class_roster($1,$2,'add',$3::jsonb,$4::uuid[]) as result`,
      [
        teacher,
        period,
        JSON.stringify([
          {
            first_name: "New",
            last_name: "Student",
            school_student_id: null,
            school_email: "new@school.edu",
            existing_student_id: null,
          },
        ]),
        [student],
      ],
    );
    assert.equal(imported.rows[0].result.added, 1);
    const addedStudent = (
      await db.query<{ id: string; school_email: string }>(
        `select id,school_email from students where school_email='new@school.edu'`,
      )
    ).rows[0];
    assert.equal(addedStudent.school_email, "new@school.edu");
    await assert.rejects(
      db.query(`select import_class_roster($1,$2,'add',$3::jsonb,$4::uuid[])`, [
        teacher,
        period,
        JSON.stringify([
          {
            first_name: "Duplicate",
            last_name: "Email",
            school_student_id: null,
            school_email: "new@school.edu",
            existing_student_id: null,
          },
        ]),
        [student, addedStudent.id],
      ]),
      /School email already exists/,
    );
  } finally {
    await db.close();
  }
});
