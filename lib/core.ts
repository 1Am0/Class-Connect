import type { Attendance, Period, Snapshot, Student, Teacher } from "@/types";
import { effectiveTimeFor } from "./weekly-schedule";
export function normalizeUid(raw: string) {
  const uid = raw.replace(/[\s:-]/g, "").toUpperCase();
  if (!/^(?:[A-F0-9]{8}|[A-F0-9]{14}|[A-F0-9]{20})$/.test(uid))
    throw new Error("UID must contain 4, 7, or 10 hexadecimal bytes.");
  return uid;
}
export function schoolClock(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const p = (t: string) => parts.find((x) => x.type === t)!.value;
  return {
    date: `${p("year")}-${p("month")}-${p("day")}`,
    time: `${p("hour")}:${p("minute")}`,
  };
}
export function activePeriod(
  teacher: Teacher,
  periods: Period[],
  now = new Date(),
) {
  if (teacher.override_period_id)
    return periods.find((p) => p.id === teacher.override_period_id && p.active);
  const { date, time } = schoolClock(teacher.timezone, now);
  return periods
    .filter((p) => p.active)
    .sort((a, b) => a.period_number - b.period_number)
    .find((p) => {
      const scheduled = effectiveTimeFor(teacher, p, date);
      return (
        scheduled && scheduled.start_time <= time && scheduled.end_time > time
      );
    });
}
export function rosterFor(s: Snapshot, periodId: string) {
  const ids = new Set(
    s.period_students
      .filter((m) => m.period_id === periodId)
      .map((m) => m.student_id),
  );
  return s.students
    .filter((x) => x.active && ids.has(x.id))
    .sort((a, b) => a.last_name.localeCompare(b.last_name));
}
export function recordsFor(s: Snapshot, periodId: string, date: string) {
  const session = s.attendance_sessions.find(
    (x) => x.period_id === periodId && x.date === date,
  );
  return s.attendance_records.filter(
    (x) => x.attendance_session_id === session?.id,
  );
}
export function presentStudents(students: Student[], records: Attendance[]) {
  return students.filter((s) =>
    records.some((r) => r.student_id === s.id && r.status === "present"),
  );
}
export function shuffled<T>(items: T[], random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function makeGroups<T>(
  students: T[],
  value: number,
  mode: "count" | "size",
  random = Math.random,
) {
  if (!Number.isInteger(value) || value < 1)
    throw new Error("Enter a positive whole number.");
  if (!students.length) return [];
  const n = Math.min(
    students.length,
    mode === "count" ? value : Math.ceil(students.length / value),
  );
  const groups: T[][] = Array.from({ length: n }, () => []);
  shuffled(students, random).forEach((s, i) => groups[i % n].push(s));
  return groups;
}
export interface ScanStore {
  snapshot(): Promise<Snapshot>;
  touch(deviceId: string, at: string, uid?: string): Promise<void>;
  checkIn(
    studentId: string,
    periodId: string,
    date: string,
    uid: string,
    at: string,
  ): Promise<{ record: Attendance; created: boolean }>;
}
export async function processScan(
  store: ScanStore,
  deviceId: string,
  rawUid: string,
  now = new Date(),
) {
  const uid = normalizeUid(rawUid),
    timestamp = now.toISOString(),
    s = await store.snapshot();
  const device = s.devices.find((d) => d.id === deviceId && d.active);
  if (!device) return { success: false, status: "unauthorized_device" };
  await store.touch(device.id, timestamp);
  if (device.enrollment_until && device.enrollment_until > timestamp) {
    await store.touch(device.id, timestamp, uid);
    return { success: true, status: "enrollment_detected", uid, timestamp };
  }
  const tag = s.rfid_tags.find((t) => t.uid === uid && t.active);
  const student = s.students.find((x) => x.id === tag?.student_id && x.active);
  if (!student) return { success: false, status: "unknown_tag" };
  const period = activePeriod(s.teacher, s.periods, now);
  if (!period) return { success: false, status: "no_active_period" };
  if (
    !s.period_students.some(
      (m) => m.period_id === period.id && m.student_id === student.id,
    )
  )
    return { success: false, status: "wrong_period" };
  const result = await store.checkIn(
    student.id,
    period.id,
    schoolClock(s.teacher.timezone, now).date,
    uid,
    timestamp,
  );
  return {
    success: true,
    status: result.created ? "checked_in" : "already_checked_in",
    student: student.display_name,
    period: period.period_number,
    timestamp: result.record.checked_in_at,
  };
}
