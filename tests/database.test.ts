import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL migration, attendance transactions, tag replacement, and tenant isolation", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
    );
    let sql = await readFile("supabase/migrations/001_classroom.sql", "utf8");
    // Supabase provides pgcrypto and Realtime publication; PGlite provides UUIDs natively.
    sql = sql
      .replace("create extension if not exists pgcrypto;", "")
      .replace(/alter publication supabase_realtime[^;]+;/g, "");
    await db.exec(sql);
    const t1 = "11111111-1111-4111-8111-111111111111",
      t2 = "22222222-2222-4222-8222-222222222222";
    await db.query(
      `insert into auth.users(id,email) values($1,'one@example.com'),($2,'two@example.com')`,
      [t1, t2],
    );
    const p = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'Engineering',3,'09:30','10:25') returning id`,
        [t1],
      )
    ).rows[0].id;
    const p2 = (
      await db.query<{ id: string }>(
        `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'Other teacher',3,'09:30','10:25') returning id`,
        [t2],
      )
    ).rows[0].id;
    const st = (
      await db.query<{ id: string }>(
        `insert into students(teacher_id,first_name,last_name,display_name) values($1,'Test','One','Test One') returning id`,
        [t1],
      )
    ).rows[0].id;
    const st2 = (
      await db.query<{ id: string }>(
        `insert into students(teacher_id,first_name,last_name,display_name) values($1,'Test','Two','Test Two') returning id`,
        [t1],
      )
    ).rows[0].id;
    await db.query(
      `insert into period_students(teacher_id,student_id,period_id) values($1,$2,$4),($1,$3,$4)`,
      [t1, st, st2, p],
    );
    await assert.rejects(() =>
      db.query(
        `insert into period_students(teacher_id,student_id,period_id) values($1,$2,$3)`,
        [t1, st, p2],
      ),
    );
    await db.query(`select replace_tag($1,$2,'04A70000')`, [t1, st]);
    const scan = () =>
      db.query<{
        result: {
          created: boolean;
          record: { checked_in_at: string; source: string };
        };
      }>(
        `select write_attendance($1,$2,$3,'2026-09-14','present','rfid','2026-09-14T16:45:00Z','04A70000') as result`,
        [t1, st, p],
      );
    assert.equal((await scan()).rows[0].result.created, true);
    assert.equal((await scan()).rows[0].result.created, false);
    assert.equal(
      (
        await db.query<{ count: number }>(
          `select count(*)::int as count from attendance_records`,
        )
      ).rows[0].count,
      2,
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          `select status from attendance_records where student_id=$1`,
          [st2],
        )
      ).rows[0].status,
      "absent",
    );
    await db.query(
      `select write_attendance($1,$2,$3,'2026-09-14','present','manual','2026-09-14T16:46:00Z',null)`,
      [t1, st, p],
    );
    assert.equal((await scan()).rows[0].result.record.source, "manual");
    await db.query(`select replace_tag($1,$2,'11223344')`, [t1, st]);
    await assert.rejects(scan);
    await assert.rejects(() =>
      db.query(`select replace_tag($1,$2,'11223344')`, [t1, st2]),
    );
    assert.equal(
      (
        await db.query<{ active: boolean }>(
          `select active from rfid_tags where uid='11223344'`,
        )
      ).rows[0].active,
      true,
    );
    await db.query(
      `select ensure_session($1,$2,'2026-09-15','2026-09-15T16:30:00Z')`,
      [t1, p],
    );
    assert.equal(
      (
        await db.query<{ count: number }>(
          `select count(*)::int as count from attendance_records where status='absent'`,
        )
      ).rows[0].count,
      3,
    );
    await db.query(
      `insert into devices(teacher_id,device_name,device_identifier,hashed_api_key) values($1,'Test scanner','test-scanner',repeat('a',64))`,
      [t1],
    );
    await db.exec(`set role authenticated;set request.jwt.claim.sub='${t2}';`);
    assert.equal((await db.query(`select * from students`)).rows.length, 0);
    assert.equal(
      (await db.query(`select * from attendance_records`)).rows.length,
      0,
    );
    assert.equal((await db.query(`select * from periods`)).rows.length, 1);
    await assert.rejects(() => db.query(`select * from devices`));
    await assert.rejects(scan);
    await assert.rejects(() =>
      db.query(`update students set display_name='Intrusion'`),
    );
    await db.exec(`set request.jwt.claim.sub='${t1}';`);
    assert.equal((await db.query(`select * from students`)).rows.length, 2);
    assert.equal(
      (await db.query(`select device_identifier from devices`)).rows.length,
      1,
    );
    await assert.rejects(() => db.query(`select hashed_api_key from devices`));
    await db.exec("reset role;");
    await db.query(`delete from period_students where student_id=$1`, [st]);
    assert.equal(
      (
        await db.query(`select * from attendance_records where student_id=$1`, [
          st,
        ])
      ).rows.length,
      2,
    );
  } finally {
    await db.close();
  }
});

test("school schedule updates selected classes atomically and preserves custom times", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
    );
    const firstMigration = (
      await readFile("supabase/migrations/001_classroom.sql", "utf8")
    )
      .replace("create extension if not exists pgcrypto;", "")
      .replace(/alter publication supabase_realtime[^;]+;/g, "");
    await db.exec(firstMigration);
    await db.exec(
      await readFile("supabase/migrations/003_bell_schedule.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/004_class_archive.sql", "utf8"),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/006_overlapping_class_times.sql",
        "utf8",
      ),
    );
    const teacher = "11111111-1111-4111-8111-111111111111";
    const other = "22222222-2222-4222-8222-222222222222";
    await db.query(
      `insert into auth.users(id,email) values($1,'one@example.com'),($2,'two@example.com')`,
      [teacher, other],
    );
    await db.query(
      `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'First',1,'08:45','09:10'),($1,'Second',2,'09:16','10:04')`,
      [teacher],
    );
    await db.query(
      `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'Other teacher',1,'07:00','07:45')`,
      [other],
    );
    const schedule = [
      { period_number: 1, start_time: "08:00", end_time: "09:00" },
      { period_number: 2, start_time: "09:16", end_time: "10:04" },
    ];
    await db.query(`select set_bell_schedule($1,$2::jsonb,true)`, [
      teacher,
      JSON.stringify(schedule),
    ]);
    const periods = (
      await db.query<{
        period_number: number;
        start_time: string;
        time_source: string;
      }>(
        `select period_number,start_time,time_source from periods where teacher_id=$1 order by period_number`,
        [teacher],
      )
    ).rows;
    assert.equal(periods[0].start_time, "08:00:00");
    assert.equal(periods[0].time_source, "school");
    assert.equal(periods[1].time_source, "custom");
    await db.query(`select set_bell_schedule($1,$2::jsonb,false)`, [
      teacher,
      JSON.stringify([
        { period_number: 1, start_time: "08:10", end_time: "09:10" },
        schedule[1],
      ]),
    ]);
    const kept = (
      await db.query<{ start_time: string; time_source: string }>(
        `select start_time,time_source from periods where teacher_id=$1 and period_number=1`,
        [teacher],
      )
    ).rows[0];
    assert.equal(kept.start_time, "08:00:00");
    assert.equal(kept.time_source, "custom");
    await db.query(`select set_bell_schedule($1,$2::jsonb,true)`, [
      teacher,
      JSON.stringify([
        { period_number: 1, start_time: "09:30", end_time: "10:30" },
        schedule[1],
      ]),
    ]);
    const saved = (
      await db.query<{ bell_schedule: typeof schedule }>(
        `select bell_schedule from teachers where id=$1`,
        [teacher],
      )
    ).rows[0].bell_schedule;
    assert.equal(saved[0].start_time, "09:30");
    assert.equal(
      (
        await db.query<{ start_time: string }>(
          `select start_time from periods where teacher_id=$1`,
          [other],
        )
      ).rows[0].start_time,
      "07:00:00",
    );
  } finally {
    await db.close();
  }
});

test("year-end cleanup is atomic, scoped to one teacher, and preserves class and scanner setup", async () => {
  const db = new PGlite();
  try {
    await db.exec(
      `create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'); create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`,
    );
    const base = (
      await readFile("supabase/migrations/001_classroom.sql", "utf8")
    )
      .replace("create extension if not exists pgcrypto;", "")
      .replace(/alter publication supabase_realtime[^;]+;/g, "");
    await db.exec(base);
    await db.exec(
      await readFile(
        "supabase/migrations/002_student_data_management.sql",
        "utf8",
      ),
    );
    const first = "11111111-1111-4111-8111-111111111111";
    const second = "22222222-2222-4222-8222-222222222222";
    await db.query(
      `insert into auth.users(id,email) values($1,'one@example.com'),($2,'two@example.com')`,
      [first, second],
    );
    for (const [teacher, number, suffix] of [
      [first, 1, "one"],
      [second, 2, "two"],
    ] as const) {
      const period = (
        await db.query<{ id: string }>(
          `insert into periods(teacher_id,name,period_number,start_time,end_time) values($1,'Class',$2,'09:00','10:00') returning id`,
          [teacher, number],
        )
      ).rows[0].id;
      const student = (
        await db.query<{ id: string }>(
          `insert into students(teacher_id,first_name,last_name,display_name) values($1,'Test','One','Test One') returning id`,
          [teacher],
        )
      ).rows[0].id;
      await db.query(
        `insert into period_students(teacher_id,student_id,period_id) values($1,$2,$3)`,
        [teacher, student, period],
      );
      await db.query(`select replace_tag($1,$2,$3)`, [
        teacher,
        student,
        suffix === "one" ? "11223344" : "AABBCCDD",
      ]);
      await db.query(
        `select write_attendance($1,$2,$3,'2026-09-14','present','manual','2026-09-14T16:45:00Z',null)`,
        [teacher, student, period],
      );
      await db.query(
        `insert into devices(teacher_id,device_name,device_identifier,hashed_api_key) values($1,'Scanner',$2,repeat('a',64))`,
        [teacher, `scanner-${suffix}`],
      );
    }
    await assert.rejects(() =>
      db.query(`select manage_student_data($1,'bad')`, [first]),
    );
    await db.exec(
      `set role authenticated;set request.jwt.claim.sub='${first}';`,
    );
    await assert.rejects(() =>
      db.query(`select manage_student_data($1,'delete_all')`, [second]),
    );
    await db.exec("reset role;");
    await db.query(`select manage_student_data($1,'clear_tags')`, [first]);
    assert.equal(
      (await db.query(`select * from rfid_tags where teacher_id=$1`, [first]))
        .rows.length,
      0,
    );
    assert.equal(
      (await db.query(`select * from students where teacher_id=$1`, [first]))
        .rows.length,
      1,
    );
    await db.query(`select manage_student_data($1,'archive')`, [first]);
    assert.equal(
      (
        await db.query<{ active: boolean }>(
          `select active from students where teacher_id=$1`,
          [first],
        )
      ).rows[0].active,
      false,
    );
    assert.equal(
      (
        await db.query(`select * from attendance_records where teacher_id=$1`, [
          first,
        ])
      ).rows.length,
      1,
    );
    await db.query(`select manage_student_data($1,'delete_all')`, [first]);
    for (const table of [
      "students",
      "period_students",
      "rfid_tags",
      "attendance_records",
      "attendance_sessions",
    ])
      assert.equal(
        (await db.query(`select * from ${table} where teacher_id=$1`, [first]))
          .rows.length,
        0,
      );
    for (const table of ["teachers", "periods", "devices"])
      assert.equal(
        (
          await db.query(
            `select * from ${table} where ${table === "teachers" ? "id" : "teacher_id"}=$1`,
            [first],
          )
        ).rows.length,
        1,
      );
    for (const table of [
      "students",
      "period_students",
      "rfid_tags",
      "attendance_records",
      "attendance_sessions",
    ])
      assert.equal(
        (await db.query(`select * from ${table} where teacher_id=$1`, [second]))
          .rows.length,
        1,
      );
  } finally {
    await db.close();
  }
});
