import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Snapshot } from "@/types";
import { demoSeed } from "../demo-seed";
import { schoolWeekdays } from "../weekly-schedule";
// One local demo process only. PostgreSQL handles production concurrency.
const globalDemo = globalThis as typeof globalThis & {
  demoLock?: Promise<unknown>;
};
export function upgradeDemoSchedule(state: Snapshot) {
  if (typeof state.teacher.weekly_schedule_version === "number") return;
  const periods = new Map(
    (state.teacher.bell_schedule ?? []).map((row) => [row.period_number, row]),
  );
  for (const period of state.periods.filter((item) => item.active)) {
    if (!periods.has(period.period_number))
      periods.set(period.period_number, {
        period_number: period.period_number,
        start_time: period.start_time.slice(0, 5),
        end_time: period.end_time.slice(0, 5),
      });
  }
  const rows = [...periods.values()].sort(
    (a, b) => a.period_number - b.period_number,
  );
  const id = randomUUID();
  state.teacher.schedule_presets = rows.length
    ? [{ id, name: "Current schedule", periods: rows }]
    : [];
  state.teacher.weekday_schedule = rows.length
    ? Object.fromEntries(schoolWeekdays.map((day) => [day, id]))
    : {};
  state.teacher.weekly_schedule_version = 1;
}
export function demoTransaction<T>(
  fn: (state: Snapshot) => T | Promise<T>,
): Promise<T> {
  const task = (globalDemo.demoLock ?? Promise.resolve()).then(async () => {
    const dir = path.join(process.cwd(), ".demo");
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, "attendance.json");
    let state: Snapshot;
    try {
      state = JSON.parse(await readFile(file, "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      state = demoSeed();
    }
    upgradeDemoSchedule(state);
    state.activity_sets ??= [];
    const result = await fn(state);
    await writeFile(file + ".tmp", JSON.stringify(state));
    await rename(file + ".tmp", file);
    return result;
  });
  globalDemo.demoLock = task.catch(() => {});
  return task;
}
