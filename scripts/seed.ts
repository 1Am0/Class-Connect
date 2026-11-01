import { createClient } from "@supabase/supabase-js";
import { demoSeed } from "../lib/demo-seed";
import { resolveSupabasePublicUrl } from "../lib/supabase-env";
import { resolveSupabaseServerKey } from "../lib/server/supabase-env";
const {
  SEED_TEACHER_ID: teacherId,
} = process.env;
const url = resolveSupabasePublicUrl(),
  key = resolveSupabaseServerKey();
if (!url || !key || !teacherId)
  throw new Error(
    "Set Supabase URL, secret/service role key, and SEED_TEACHER_ID. Create the teacher in Supabase Auth first.",
  );
const db = createClient(url, key, { auth: { persistSession: false } });
const { data: existing, error: lookupError } = await db
  .from("periods")
  .select("id")
  .eq("teacher_id", teacherId);
if (lookupError) throw lookupError;
if (existing?.length)
  throw new Error(
    "Seed only an empty teacher account; existing periods were found.",
  );
const seed = demoSeed();
for (const table of [
  "periods",
  "students",
  "period_students",
  "rfid_tags",
  "attendance_sessions",
  "attendance_records",
] as const) {
  const { error } = await db
    .from(table)
    .insert(seed[table].map((row) => ({ ...row, teacher_id: teacherId })));
  if (error) throw error;
}
const { error } = await db
  .from("teachers")
  .update({ override_period_id: seed.periods[2].id })
  .eq("id", teacherId);
if (error) throw error;
console.log(
  "Seed complete: three class periods, 31 sample students, tags, and today’s attendance. Create your scanner through the website.",
);
