import type {
  BellPeriod,
  Period,
  SchedulePreset,
  SchoolWeekday,
  Teacher,
} from "@/types";
import { bellScheduleError } from "./bell-schedule";

export const schoolWeekdays: SchoolWeekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];
export function weekdayForSchoolDate(date: string): SchoolWeekday | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5 ? schoolWeekdays[day - 1] : null;
}
export function hasWeeklySchedule(teacher: Teacher) {
  return (
    Array.isArray(teacher.schedule_presets) &&
    !!teacher.weekday_schedule &&
    typeof teacher.weekly_schedule_version === "number"
  );
}
export function presetForDate(
  teacher: Teacher,
  date: string,
): SchedulePreset | null {
  if (!hasWeeklySchedule(teacher)) return null;
  const weekday = weekdayForSchoolDate(date);
  const id = weekday ? teacher.weekday_schedule?.[weekday] : undefined;
  return teacher.schedule_presets?.find((preset) => preset.id === id) ?? null;
}
export function effectiveTimeFor(
  teacher: Teacher,
  period: Period,
  date: string,
): BellPeriod | null {
  if (!hasWeeklySchedule(teacher))
    return {
      period_number: period.period_number,
      start_time: period.start_time.slice(0, 5),
      end_time: period.end_time.slice(0, 5),
    };
  const bell = presetForDate(teacher, date)?.periods.find(
    (entry) => entry.period_number === period.period_number,
  );
  if (!bell) return null;
  return period.time_source === "custom"
    ? {
        period_number: period.period_number,
        start_time: period.start_time.slice(0, 5),
        end_time: period.end_time.slice(0, 5),
      }
    : bell;
}
export function firstAssignedBellTime(
  teacher: Teacher,
  periodNumber: number,
  date?: string,
): BellPeriod | undefined {
  if (!hasWeeklySchedule(teacher))
    return teacher.bell_schedule?.find(
      (entry) => entry.period_number === periodNumber,
    );
  const today = date
    ? presetForDate(teacher, date)?.periods.find(
        (entry) => entry.period_number === periodNumber,
      )
    : undefined;
  if (today) return today;
  for (const day of schoolWeekdays) {
    const preset = teacher.schedule_presets?.find(
      (item) => item.id === teacher.weekday_schedule?.[day],
    );
    const bell = preset?.periods.find(
      (entry) => entry.period_number === periodNumber,
    );
    if (bell) return bell;
  }
  return undefined;
}
export function weeklyScheduleError(
  presets: SchedulePreset[],
  assignments: Partial<Record<SchoolWeekday, string>>,
): string | null {
  if (!Array.isArray(presets) || presets.length > 20)
    return "Save at most 20 schedule presets.";
  const ids = new Set<string>(),
    names = new Set<string>();
  for (const preset of presets) {
    const name = preset.name.trim();
    if (!name || name.length > 60)
      return "Each schedule needs a name of 1–60 characters.";
    if (ids.has(preset.id)) return "A schedule ID appears more than once.";
    if (names.has(name.toLocaleLowerCase()))
      return `A schedule named ${name} already exists.`;
    ids.add(preset.id);
    names.add(name.toLocaleLowerCase());
    if (!Array.isArray(preset.periods))
      return `${name} needs a list of periods.`;
    const error = bellScheduleError(preset.periods);
    if (error) return `${name}: ${error}`;
  }
  for (const [day, id] of Object.entries(assignments)) {
    if (!schoolWeekdays.includes(day as SchoolWeekday))
      return "Assign schedules only to Monday through Friday.";
    if (id && !ids.has(id)) return `${day} refers to a missing schedule.`;
  }
  return null;
}
export function overlapWarnings(periods: BellPeriod[]): string[] {
  const sorted = [...periods].sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  );
  const warnings: string[] = [];
  for (let i = 0; i < sorted.length; i++)
    for (let j = i + 1; j < sorted.length; j++)
      if (
        sorted[i].start_time < sorted[j].end_time &&
        sorted[j].start_time < sorted[i].end_time
      )
        warnings.push(
          `Periods ${sorted[i].period_number} and ${sorted[j].period_number} overlap.`,
        );
  return warnings;
}
