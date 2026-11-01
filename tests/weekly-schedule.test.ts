import { test } from "node:test";
import assert from "node:assert/strict";
import { activePeriod, schoolClock } from "../lib/core";
import {
  effectiveTimeFor,
  presetForDate,
  weekdayForSchoolDate,
} from "../lib/weekly-schedule";
import type { Period, Teacher } from "../types";
import { demoSeed } from "../lib/demo-seed";
import { upgradeDemoSchedule } from "../lib/server/demo";

const monday = "2026-10-05";
const teacher: Teacher = {
  id: "teacher",
  name: "Teacher",
  email: "teacher@example.com",
  timezone: "America/Los_Angeles",
  override_period_id: null,
  bell_schedule: [{ period_number: 1, start_time: "08:00", end_time: "09:00" }],
  schedule_presets: [
    {
      id: "regular",
      name: "Regular",
      periods: [
        { period_number: 1, start_time: "08:00", end_time: "09:00" },
        { period_number: 2, start_time: "09:15", end_time: "10:00" },
      ],
    },
    {
      id: "short",
      name: "Short",
      periods: [{ period_number: 1, start_time: "09:00", end_time: "09:40" }],
    },
  ],
  weekday_schedule: {
    monday: "regular",
    tuesday: "regular",
    wednesday: "short",
    thursday: "regular",
    friday: "short",
  },
  weekly_schedule_version: 1,
};
const periods: Period[] = [1, 2].map((number) => ({
  id: String(number),
  teacher_id: teacher.id,
  name: `Class ${number}`,
  period_number: number,
  start_time: number === 1 ? "08:00" : "09:15",
  end_time: number === 1 ? "09:00" : "10:00",
  active: true,
  time_source: "school",
}));
const at = (date: string, time: string) => new Date(`${date}T${time}:00Z`);

test("saved demo classrooms gain a weekday preset without losing their data", () => {
  const state = demoSeed();
  const originalClasses = structuredClone(state.periods);
  const originalStudents = structuredClone(state.students);
  delete state.teacher.schedule_presets;
  delete state.teacher.weekday_schedule;
  delete state.teacher.weekly_schedule_version;
  upgradeDemoSchedule(state);
  const updatedTeacher = state.teacher as unknown as Teacher;
  assert.equal(updatedTeacher.schedule_presets?.[0].periods.length, 3);
  assert.equal(updatedTeacher.weekday_schedule?.monday, updatedTeacher.weekday_schedule?.friday);
  assert.deepEqual(state.periods, originalClasses);
  assert.deepEqual(state.students, originalStudents);
});

test("each school weekday selects its assigned reusable preset", () => {
  for (const [date, day, name] of [
    ["2026-10-05", "monday", "Regular"],
    ["2026-10-06", "tuesday", "Regular"],
    ["2026-10-07", "wednesday", "Short"],
    ["2026-10-08", "thursday", "Regular"],
    ["2026-10-09", "friday", "Short"],
  ]) {
    assert.equal(weekdayForSchoolDate(date), day);
    assert.equal(presetForDate(teacher, date)?.name, name);
  }
  assert.equal(presetForDate(teacher, "2026-10-10"), null);
});

test("omitted and unassigned periods do not route automatically; manual override still wins", () => {
  assert.equal(effectiveTimeFor(teacher, periods[1], "2026-10-07"), null);
  assert.equal(
    activePeriod(teacher, periods, at("2026-10-07", "16:20"))?.id,
    "1",
  );
  assert.equal(
    activePeriod(teacher, periods, at("2026-10-07", "17:00")),
    undefined,
  );
  assert.equal(
    activePeriod(teacher, periods, at("2026-10-10", "16:20")),
    undefined,
  );
  assert.equal(
    activePeriod(
      { ...teacher, override_period_id: "2" },
      periods,
      at("2026-10-10", "16:20"),
    )?.id,
    "2",
  );
});

test("custom class times apply only on assigned days that include its period", () => {
  const custom = {
    ...periods[0],
    time_source: "custom" as const,
    start_time: "07:30",
    end_time: "08:20",
  };
  assert.deepEqual(effectiveTimeFor(teacher, custom, monday), {
    period_number: 1,
    start_time: "07:30",
    end_time: "08:20",
  });
  assert.equal(effectiveTimeFor(teacher, custom, "2026-10-10"), null);
  assert.equal(
    effectiveTimeFor(teacher, { ...custom, period_number: 2 }, "2026-10-07"),
    null,
  );
});

test("school-local clock and DST choose the correct weekday and time", () => {
  assert.deepEqual(
    schoolClock("America/Los_Angeles", at("2026-11-01", "08:30")),
    { date: "2026-11-01", time: "01:30" },
  );
  assert.equal(
    weekdayForSchoolDate(
      schoolClock("America/Los_Angeles", at("2026-10-06", "06:30")).date,
    ),
    "monday",
  );
  assert.equal(
    activePeriod(teacher, periods, at("2026-10-06", "06:30")),
    undefined,
  );
});
