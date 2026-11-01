import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { Period } from "@/types";
import { orderHomeClasses, reorderHomeClass } from "../lib/home-preferences";
import { homeClassesInput } from "../lib/server/home-preferences";

const makeClass = (id: string, period_number: number): Period => ({
  id,
  teacher_id: "teacher",
  name: `Class ${period_number}`,
  period_number,
  start_time: "09:00",
  end_time: "09:50",
  active: true,
});

test("home order keeps teacher choices and includes newly added classes", () => {
  const classes = [
    makeClass("one", 1),
    makeClass("two", 2),
    makeClass("three", 3),
  ];
  assert.deepEqual(
    orderHomeClasses(classes, ["three", "one", "archived"]).map(
      (item) => item.id,
    ),
    ["three", "one", "two"],
  );
  assert.deepEqual(
    orderHomeClasses(classes, []).map((item) => item.id),
    ["one", "two", "three"],
  );
  assert.deepEqual(reorderHomeClass(["one", "two", "three"], "two", "one"), [
    "two",
    "one",
    "three",
  ]);
  assert.deepEqual(reorderHomeClass(["one", "two", "three"], "one", "three"), [
    "two",
    "three",
    "one",
  ]);
  assert.deepEqual(
    reorderHomeClass(["one", "two", "three"], "three", "missing"),
    ["one", "two", "three"],
  );
});

test("home class ordering rejects duplicate or malformed class IDs", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  assert.equal(homeClassesInput.safeParse({ order: [id] }).success, true);
  assert.equal(homeClassesInput.safeParse({ order: [id, id] }).success, false);
  assert.equal(
    homeClassesInput.safeParse({ order: ["not-a-uuid"] }).success,
    false,
  );
});

test("home preferences migration keeps existing teachers and an order default", async () => {
  const db = new PGlite();
  try {
    await db.exec("create table public.teachers (id uuid primary key);");
    const id = "11111111-1111-4111-8111-111111111111";
    await db.query("insert into public.teachers(id) values($1)", [id]);
    await db.exec(
      await readFile("supabase/migrations/005_home_preferences.sql", "utf8"),
    );
    const row = (
      await db.query<{ home_class_preferences: unknown }>(
        "select home_class_preferences from public.teachers where id=$1",
        [id],
      )
    ).rows[0];
    assert.deepEqual(row.home_class_preferences, { order: [], accents: {} });
  } finally {
    await db.close();
  }
});
