import type { Period, Teacher } from "@/types";
import { schoolClock } from "./core";
import { effectiveTimeFor } from "./weekly-schedule";

export type ClassTiming = "now" | "next" | "later" | "done" | "off";
export interface TodayClass {
  period: Period;
  time: { start_time: string; end_time: string } | null;
  timing: ClassTiming;
}

/**
 * Active classes in the order they meet today, labelled relative to the
 * school clock. Classes that do not meet today follow, by period number.
 * This follows the schedule only; a manual scanner override does not move it.
 */
export function todaySchedule(
  teacher: Teacher,
  periods: Period[],
  now = new Date(),
): TodayClass[] {
  const { date, time } = schoolClock(teacher.timezone, now);
  const rows = periods
    .filter((period) => period.active)
    .map((period) => ({
      period,
      time: effectiveTimeFor(teacher, period, date),
    }));
  const meeting = rows
    .filter((row) => row.time)
    .sort(
      (a, b) =>
        a.time!.start_time.localeCompare(b.time!.start_time) ||
        a.period.period_number - b.period.period_number,
    );
  let nextFound = false;
  const timed = meeting.map((row): TodayClass => {
    const { start_time, end_time } = row.time!;
    let timing: ClassTiming;
    if (start_time <= time && end_time > time) timing = "now";
    else if (end_time <= time) timing = "done";
    else if (!nextFound) {
      timing = "next";
      nextFound = true;
    } else timing = "later";
    return { ...row, timing };
  });
  const off = rows
    .filter((row) => !row.time)
    .sort((a, b) => a.period.period_number - b.period.period_number)
    .map((row): TodayClass => ({ ...row, timing: "off" }));
  return [...timed, ...off];
}
