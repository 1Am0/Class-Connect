import { randomUUID } from "node:crypto";
import type { Snapshot, Student } from "@/types";
import {
  validateImport,
  type ImportMode,
  type RosterRow,
} from "@/lib/roster-import";

export interface RosterImportRequest {
  period_id: string;
  mode: ImportMode;
  rows: (RosterRow & { existing_student_id: string | null })[];
  expected_student_ids: string[];
}
export interface RosterImportResult {
  added: number;
  existing: number;
  removed: number;
  reactivated: number;
}

export function applyDemoRosterImport(
  state: Snapshot,
  teacherId: string,
  input: RosterImportRequest,
): RosterImportResult {
  const period = state.periods.find(
    (p) => p.id === input.period_id && p.teacher_id === teacherId && p.active,
  );
  if (!period) throw new Error("Class is unavailable.");
  const students = state.students.filter((s) => s.teacher_id === teacherId);
  const error = validateImport(input.rows, students);
  if (error) throw new Error(error);
  const currentIds = state.period_students
    .filter(
      (m) => m.period_id === input.period_id && m.teacher_id === teacherId,
    )
    .map((m) => m.student_id)
    .sort();
  if (
    JSON.stringify(currentIds) !==
    JSON.stringify([...input.expected_student_ids].sort())
  )
    throw new Error("Roster changed. Refresh and preview again.");
  const keep = new Set<string>();
  const result: RosterImportResult = {
    added: 0,
    existing: 0,
    removed: 0,
    reactivated: 0,
  };
  for (const row of input.rows) {
    let student: Student;
    if (row.existing_student_id) {
      student = students.find((s) => s.id === row.existing_student_id)!;
      if (!student.active) {
        student.active = true;
        result.reactivated++;
      }
      if (!student.school_student_id && row.school_student_id)
        student.school_student_id = row.school_student_id;
      if (!student.school_email && row.school_email)
        student.school_email = row.school_email.trim().toLowerCase();
      result.existing++;
    } else {
      student = {
        id: randomUUID(),
        teacher_id: teacherId,
        first_name: row.first_name.trim(),
        last_name: row.last_name.trim(),
        display_name: `${row.first_name.trim()} ${row.last_name.trim()}`,
        school_student_id: row.school_student_id,
        school_email: row.school_email?.trim().toLowerCase() || null,
        optional_notes: "",
        active: true,
      };
      state.students.push(student);
      result.added++;
    }
    keep.add(student.id);
    if (
      !state.period_students.some(
        (m) => m.period_id === input.period_id && m.student_id === student.id,
      )
    )
      state.period_students.push({
        id: randomUUID(),
        teacher_id: teacherId,
        period_id: input.period_id,
        student_id: student.id,
      });
    const today = new Date().toLocaleDateString("en-CA", {
      timeZone: state.teacher.timezone,
    });
    const todaySession = state.attendance_sessions.find(
      (session) =>
        session.period_id === input.period_id &&
        session.date === today &&
        session.status === "open",
    );
    if (
      todaySession &&
      !state.attendance_records.some(
        (record) =>
          record.attendance_session_id === todaySession.id &&
          record.student_id === student.id,
      )
    )
      state.attendance_records.push({
        id: randomUUID(),
        teacher_id: teacherId,
        attendance_session_id: todaySession.id,
        student_id: student.id,
        status: "absent",
        checked_in_at: null,
        source: "manual",
      });
  }
  if (input.mode === "sync") {
    const before = state.period_students.length;
    state.period_students = state.period_students.filter(
      (m) =>
        m.period_id !== input.period_id ||
        m.teacher_id !== teacherId ||
        keep.has(m.student_id),
    );
    result.removed = before - state.period_students.length;
  }
  return result;
}
