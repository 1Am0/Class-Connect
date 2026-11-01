import { randomUUID } from "node:crypto";
import type { Snapshot } from "@/types";
import { schoolClock } from "./core";
export function demoSeed(): Snapshot {
  const presetId = randomUUID();
  const teacher = {
    id: randomUUID(),
    name: "Demo Teacher",
    email: "teacher@example.com",
    timezone: "America/Los_Angeles",
    override_period_id: null as string | null,
    bell_schedule: [],
    schedule_presets: [
      {
        id: presetId,
        name: "Regular day",
        periods: [
          { period_number: 1, start_time: "07:30", end_time: "08:25" },
          { period_number: 2, start_time: "08:30", end_time: "09:25" },
          { period_number: 3, start_time: "09:30", end_time: "10:25" },
        ],
      },
    ],
    weekday_schedule: {
      monday: presetId,
      tuesday: presetId,
      wednesday: presetId,
      thursday: presetId,
      friday: presetId,
    },
    weekly_schedule_version: 1,
    home_class_preferences: { order: [] },
  };
  const periods = [
    "Engineering Design",
    "Design & Development",
    "Engineering Essentials",
  ].map((name, i) => ({
    id: randomUUID(),
    teacher_id: teacher.id,
    name,
    period_number: i + 1,
    start_time: ["07:30", "08:30", "09:30"][i],
    end_time: ["08:25", "09:25", "10:25"][i],
    active: true,
    time_source: "custom" as const,
  }));
  teacher.override_period_id = periods[2].id;
  const names = Array.from(
    { length: 31 },
    (_, i) => `Student ${String(i + 1).padStart(2, "0")}`,
  );
  const students = names.map((n) => ({
    id: randomUUID(),
    teacher_id: teacher.id,
    first_name: n.split(" ")[0],
    last_name: n.split(" ")[1],
    display_name: n,
    optional_notes: "",
    active: true,
  }));
  const period_students = periods.flatMap((p, i) =>
    students.slice(0, [28, 31, 29][i]).map((s) => ({
      id: randomUUID(),
      teacher_id: teacher.id,
      period_id: p.id,
      student_id: s.id,
    })),
  );
  const rfid_tags = students.map((s, i) => ({
    id: randomUUID(),
    teacher_id: teacher.id,
    student_id: s.id,
    uid: (0x04a70000 + i).toString(16).padStart(8, "0").toUpperCase(),
    active: true,
    assigned_at: new Date().toISOString(),
  }));
  const today = schoolClock(teacher.timezone).date;
  const attendance_sessions = periods.map((p) => ({
    id: randomUUID(),
    teacher_id: teacher.id,
    period_id: p.id,
    date: today,
    started_at: new Date().toISOString(),
    ended_at: null,
    status: "open",
  }));
  const attendance_records: Snapshot["attendance_records"] =
    attendance_sessions.flatMap((session, i) =>
      students.slice(0, [28, 31, 29][i]).map((s, j) => ({
        id: randomUUID(),
        teacher_id: teacher.id,
        attendance_session_id: session.id,
        student_id: s.id,
        status: j < [26, 28, 25][i] ? "present" : "absent",
        checked_in_at:
          j < [26, 28, 25][i]
            ? new Date(Date.now() - (30 - j) * 60000).toISOString()
            : null,
        source: j < [26, 28, 25][i] ? "rfid" : "manual",
      })),
    );
  return {
    teacher,
    periods,
    students,
    period_students,
    rfid_tags,
    attendance_sessions,
    attendance_records,
    devices: [
      {
        id: randomUUID(),
        teacher_id: teacher.id,
        device_name: "Classroom scanner",
        device_identifier: "classroom-scanner",
        active: true,
        last_seen_at: null,
        enrollment_until: null,
        pending_uid: null,
      },
    ],
    activity_sets: [],
    demo: true,
    simulator: true,
  };
}
