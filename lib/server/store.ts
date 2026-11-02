import { randomUUID } from "node:crypto";
import type {
  Snapshot,
  Attendance,
  Tables,
  BellPeriod,
  SchedulePreset,
  SchoolWeekday,
  Status,
} from "@/types";
import {
  attendanceConflict,
  attendancePatch,
  type AttendanceVersion,
} from "../attendance-edit";
import type { RelayStore } from "./bluetooth";
import { admin } from "./supabase";
import { demoTransaction } from "./demo";
import { isDemo, simulatorEnabled } from "./config";
import { autoSessionPeriod, rosterFor, schoolClock } from "../core";
import { ensureDemoSession } from "./demo-session";
import { bellTimeFor } from "../bell-schedule";
import { weeklyScheduleError } from "../weekly-schedule";
import {
  applyDemoRosterImport,
  type RosterImportRequest,
  type RosterImportResult,
} from "./roster-import";
const tables = [
  "periods",
  "students",
  "period_students",
  "rfid_tags",
  "attendance_sessions",
  "attendance_records",
  "devices",
  "activity_sets",
] as const;
export const deviceColumns =
  "id,teacher_id,device_name,device_identifier,active,last_seen_at,enrollment_until,pending_uid";
export class Store implements RelayStore {
  constructor(public teacherId: string) {}
  async importRoster(input: RosterImportRequest): Promise<RosterImportResult> {
    if (isDemo())
      return demoTransaction((state) =>
        applyDemoRosterImport(state, this.teacherId, input),
      );
    const { data, error } = await admin().rpc("import_class_roster", {
      p_teacher: this.teacherId,
      p_period: input.period_id,
      p_mode: input.mode,
      p_rows: input.rows,
      p_expected_ids: input.expected_student_ids,
    });
    if (error) {
      if (error.code === "PGRST202")
        throw new Error(
          "Roster import needs database migration 007. Ask the project owner to apply it first.",
        );
      throw error;
    }
    return data as RosterImportResult;
  }
  async activeDevice(deviceId: string): Promise<boolean> {
    if (isDemo())
      return demoTransaction((s) =>
        s.devices.some((d) => d.id === deviceId && d.active),
      );
    const { data, error } = await admin()
      .from("devices")
      .select("id")
      .eq("teacher_id", this.teacherId)
      .eq("id", deviceId)
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  }
  async pendingEnrollmentUid(deviceId: string): Promise<string | null> {
    const now = new Date().toISOString();
    if (isDemo())
      return demoTransaction(
        (s) =>
          s.devices.find(
            (d) =>
              d.id === deviceId &&
              d.active &&
              d.enrollment_until &&
              d.enrollment_until > now,
          )?.pending_uid ?? null,
      );
    const { data, error } = await admin()
      .from("devices")
      .select("pending_uid")
      .eq("teacher_id", this.teacherId)
      .eq("id", deviceId)
      .eq("active", true)
      .gt("enrollment_until", now)
      .maybeSingle();
    if (error) throw error;
    return data?.pending_uid ?? null;
  }
  async snapshot(): Promise<Snapshot> {
    if (isDemo())
      return demoTransaction((s) => {
        const p = autoSessionPeriod(s.teacher, s.periods);
        if (p && rosterFor(s, p.id).length)
          ensureDemoSession(
            s,
            p.id,
            schoolClock(s.teacher.timezone).date,
            new Date().toISOString(),
          );
        return structuredClone(s);
      });
    const db = admin();
    const [teacherResult, results] = await Promise.all([
      db.from("teachers").select("*").eq("id", this.teacherId).single(),
      Promise.all(
        tables.map(async (t) => {
          const rows: unknown[] = [];
          for (let offset = 0; ; offset += 1000) {
            const { data, error } = await db
              .from(t)
              .select(t === "devices" ? deviceColumns : "*")
              .eq("teacher_id", this.teacherId)
              .order("id")
              .range(offset, offset + 999);
            if (error) {
              if (
                t === "activity_sets" &&
                ["42P01", "PGRST205"].includes(error.code ?? "")
              )
                return [];
              throw error;
            }
            rows.push(...data);
            if (data.length < 1000) break;
          }
          return rows;
        }),
      ),
    ]);
    if (teacherResult.error) throw teacherResult.error;
    const teacher = teacherResult.data;
    const s = {
      teacher,
      ...Object.fromEntries(tables.map((t, i) => [t, results[i]])),
      demo: false,
      simulator: simulatorEnabled(),
    } as Snapshot;
    const p = autoSessionPeriod(s.teacher, s.periods),
      date = schoolClock(s.teacher.timezone).date;
    if (
      p &&
      rosterFor(s, p.id).length > 0 &&
      !s.attendance_sessions.some(
        (x) => x.period_id === p.id && x.date === date,
      )
    ) {
      const { error } = await db.rpc("ensure_session", {
        p_teacher: this.teacherId,
        p_period: p.id,
        p_date: date,
        p_at: new Date().toISOString(),
      });
      if (error) throw error;
      return this.snapshot();
    }
    return s;
  }
  async touch(id: string, at: string, uid?: string) {
    await this.save("devices", {
      id,
      last_seen_at: at,
      ...(uid ? { pending_uid: uid } : {}),
    });
  }
  async save<K extends keyof Tables>(table: K, values: Partial<Tables[K]>) {
    const row = {
      ...values,
      id: values.id ?? randomUUID(),
      teacher_id: this.teacherId,
    };
    if (isDemo())
      return demoTransaction((s) => {
        const rows = s[table] as unknown as Record<string, unknown>[];
        const existing = rows.find((x) => x.id === row.id);
        if (existing) Object.assign(existing, row);
        else rows.push(row);
        return row.id;
      });
    const db = admin();
    const result = values.id
      ? await db
          .from(table)
          .update(row)
          .eq("id", values.id)
          .eq("teacher_id", this.teacherId)
      : await db.from(table).insert(row);
    if (result.error) throw result.error;
    return row.id;
  }
  async deleteActivitySet(id: string) {
    if (isDemo())
      return demoTransaction((s) => {
        s.activity_sets = s.activity_sets.filter(
          (set) => set.id !== id || set.teacher_id !== this.teacherId,
        );
      });
    const { error } = await admin()
      .from("activity_sets")
      .delete()
      .eq("id", id)
      .eq("teacher_id", this.teacherId);
    if (error) throw error;
  }
  async setClassActive(periodId: string, active: boolean) {
    if (isDemo())
      return demoTransaction((s) => {
        const period = s.periods.find(
          (item) => item.id === periodId && item.teacher_id === this.teacherId,
        );
        if (!period) throw new Error("Class not found.");
        if (period.active === active) return false;
        if (active) {
          if (
            s.periods.some(
              (other) =>
                other.id !== periodId &&
                other.teacher_id === this.teacherId &&
                other.active &&
                other.period_number === period.period_number,
            )
          )
            throw new Error(
              "Another active class uses this period. Edit the archived class before restoring it.",
            );
        }
        period.active = active;
        if (!active && s.teacher.override_period_id === periodId) {
          s.teacher.override_period_id = null;
          return true;
        }
        return false;
      });
    const { data, error } = await admin().rpc("set_class_active", {
      p_teacher: this.teacherId,
      p_period: periodId,
      p_active: active,
    });
    if (error) {
      if (error.code === "PGRST202")
        throw new Error(
          "Class archiving needs database migration 004. Ask the project owner to apply it first.",
        );
      throw error;
    }
    return data as boolean;
  }
  async endEnrollment(deviceId: string, expectedUntil?: string) {
    if (isDemo())
      return demoTransaction((s) => {
        const device = s.devices.find((d) => d.id === deviceId);
        if (
          !device ||
          (expectedUntil && device.enrollment_until !== expectedUntil)
        )
          return;
        device.enrollment_until = null;
        device.pending_uid = null;
      });
    let query = admin()
      .from("devices")
      .update({ enrollment_until: null, pending_uid: null })
      .eq("id", deviceId)
      .eq("teacher_id", this.teacherId);
    if (expectedUntil) query = query.eq("enrollment_until", expectedUntil);
    const { error } = await query;
    if (error) throw error;
  }
  async removeMembership(studentId: string, periodId: string) {
    if (isDemo())
      return demoTransaction((s) => {
        s.period_students = s.period_students.filter(
          (m) => !(m.student_id === studentId && m.period_id === periodId),
        );
      });
    const { error } = await admin()
      .from("period_students")
      .delete()
      .eq("teacher_id", this.teacherId)
      .eq("student_id", studentId)
      .eq("period_id", periodId);
    if (error) throw error;
  }
  async settings(values: Record<string, unknown>) {
    if (isDemo())
      return demoTransaction((s) => {
        Object.assign(s.teacher, values);
      });
    const { error } = await admin()
      .from("teachers")
      .update(values)
      .eq("id", this.teacherId);
    if (error) throw error;
  }
  async bellSchedule(schedule: BellPeriod[], updateExisting: boolean) {
    if (isDemo())
      return demoTransaction((s) => {
        s.teacher.bell_schedule = schedule;
        for (const period of s.periods) {
          if (!period.active) continue;
          const bellTime = bellTimeFor(schedule, period.period_number);
          if (
            updateExisting &&
            bellTime &&
            (period.time_source === "school" ||
              period.start_time.slice(0, 5) !== bellTime.start_time ||
              period.end_time.slice(0, 5) !== bellTime.end_time)
          ) {
            period.start_time = bellTime.start_time;
            period.end_time = bellTime.end_time;
            period.time_source = "school";
          } else if (
            period.time_source === "school" &&
            (!bellTime ||
              period.start_time.slice(0, 5) !== bellTime.start_time ||
              period.end_time.slice(0, 5) !== bellTime.end_time)
          ) {
            period.time_source = "custom";
          }
        }
      });
    const { error } = await admin().rpc("set_bell_schedule", {
      p_teacher: this.teacherId,
      p_schedule: schedule,
      p_update_existing: updateExisting,
    });
    if (error) throw error;
  }
  async weeklySchedule(
    presets: SchedulePreset[],
    assignments: Partial<Record<SchoolWeekday, string>>,
    expectedVersion: number,
  ): Promise<number> {
    const issue = weeklyScheduleError(presets, assignments);
    if (issue) throw new Error(issue);
    if (isDemo())
      return demoTransaction((s) => {
        if (s.teacher.weekly_schedule_version !== expectedVersion)
          throw new Error("Schedule changed elsewhere. Reload and try again.");
        s.teacher.schedule_presets = structuredClone(presets);
        s.teacher.weekday_schedule = { ...assignments };
        s.teacher.weekly_schedule_version = expectedVersion + 1;
        return s.teacher.weekly_schedule_version;
      });
    const { data, error } = await admin().rpc("set_weekly_schedule", {
      p_teacher: this.teacherId,
      p_presets: presets,
      p_assignments: assignments,
      p_expected_version: expectedVersion,
    });
    if (error) {
      if (error.code === "PGRST202")
        throw new Error(
          "Weekly schedule needs database migration 008. Ask the project owner to apply it first.",
        );
      throw error;
    }
    return data as number;
  }
  async manageStudentData(action: "archive" | "clear_tags" | "delete_all") {
    if (isDemo())
      return demoTransaction((s) => {
        const counts = {
          students: s.students.length,
          records: s.attendance_records.length,
          tags: s.rfid_tags.length,
        };
        if (action === "archive")
          s.students.forEach((student) => {
            student.active = false;
          });
        s.rfid_tags = [];
        s.devices.forEach((device) => {
          device.enrollment_until = null;
          device.pending_uid = null;
        });
        if (action === "delete_all") {
          s.attendance_records = [];
          s.attendance_sessions = [];
          s.period_students = [];
          s.students = [];
        }
        return counts;
      });
    const { data, error } = await admin().rpc("manage_student_data", {
      p_teacher: this.teacherId,
      p_action: action,
    });
    if (error) throw error;
    return data as { students: number; records: number; tags: number };
  }
  async editAttendance(
    studentId: string,
    periodId: string,
    date: string,
    status: Status,
    restore?: Omit<AttendanceVersion, "id">,
  ): Promise<{ before: Attendance; record: Attendance }> {
    // The teacher's change always wins over whatever the cloud copy holds.
    const at = new Date().toISOString();
    const patch = attendancePatch(status, at, restore);
    if (isDemo())
      return demoTransaction((s) => {
        const session = ensureDemoSession(s, periodId, date, at);
        const record = s.attendance_records.find(
          (r) =>
            r.attendance_session_id === session.id &&
            r.student_id === studentId,
        );
        if (!record) throw new Error(attendanceConflict);
        const before = structuredClone(record);
        if (!restore && record.status === status)
          return { before, record: structuredClone(record) };
        Object.assign(record, patch);
        return { before, record: structuredClone(record) };
      });
    const db = admin();
    const { data: sessionId, error: sessionError } = await db.rpc(
      "ensure_session",
      {
        p_teacher: this.teacherId,
        p_period: periodId,
        p_date: date,
        p_at: at,
      },
    );
    if (sessionError) throw sessionError;
    const { data: before, error: readError } = await db
      .from("attendance_records")
      .select("*")
      .eq("teacher_id", this.teacherId)
      .eq("attendance_session_id", sessionId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (readError) throw readError;
    if (!before) throw new Error(attendanceConflict);
    if (!restore && before.status === status) return { before, record: before };
    // Compare inside the UPDATE, so a scanner/teacher change between the read
    // and write cannot be overwritten. Undo restores the exact prior fields.
    let query = db
      .from("attendance_records")
      .update(patch)
      .eq("teacher_id", this.teacherId)
      .eq("id", before.id)
      .eq("status", before.status)
      .eq("source", before.source);
    query =
      before.checked_in_at === null
        ? query.is("checked_in_at", null)
        : query.eq("checked_in_at", before.checked_in_at);
    const { data: record, error } = await query.select("*").maybeSingle();
    if (error) throw error;
    if (!record) throw new Error(attendanceConflict);
    return { before, record };
  }
  /** Demo only; Supabase saves notes in apply_attendance_operation. */
  async attendanceNote(
    studentId: string,
    periodId: string,
    date: string,
    text: string,
  ): Promise<{ record: Attendance }> {
    const at = new Date().toISOString();
    const note = text.trim() || null;
    return demoTransaction((s) => {
      const session = ensureDemoSession(s, periodId, date, at);
      let record = s.attendance_records.find(
        (r) =>
          r.attendance_session_id === session.id && r.student_id === studentId,
      );
      if (!record) {
        record = {
          id: randomUUID(),
          teacher_id: this.teacherId,
          attendance_session_id: session.id,
          student_id: studentId,
          status: "absent",
          source: "manual",
          checked_in_at: null,
        };
        s.attendance_records.push(record);
      }
      record.note = note;
      return { record: structuredClone(record) };
    });
  }
  async attendance(
    studentId: string,
    periodId: string,
    date: string,
    status: string,
    source: string,
    at: string,
    uid?: string,
  ): Promise<{ record: Attendance; created: boolean }> {
    if (!isDemo()) {
      const { data, error } = await admin().rpc("write_attendance", {
        p_teacher: this.teacherId,
        p_student: studentId,
        p_period: periodId,
        p_date: date,
        p_status: status,
        p_source: source,
        p_at: at,
        p_uid: uid ?? null,
      });
      if (error) throw error;
      return data;
    }
    return demoTransaction((s) => {
      if (
        source === "rfid" &&
        !s.periods.some((period) => period.id === periodId && period.active)
      )
        throw new Error("Class is archived or unavailable.");
      if (
        !s.students.some((x) => x.id === studentId && x.active) ||
        !s.period_students.some(
          (x) => x.student_id === studentId && x.period_id === periodId,
        )
      )
        throw new Error("Student is not enrolled in this period.");
      if (
        uid &&
        !s.rfid_tags.some(
          (t) => t.student_id === studentId && t.uid === uid && t.active,
        )
      )
        throw new Error("Tag is no longer active.");
      const session = ensureDemoSession(s, periodId, date, at);
      let record = s.attendance_records.find(
        (r) =>
          r.attendance_session_id === session.id && r.student_id === studentId,
      );
      if (
        source === "rfid" &&
        record &&
        (record.status === "present" || record.status === "late")
      )
        return { record, created: false };
      const patch = {
        status: status as Attendance["status"],
        source: source as Attendance["source"],
        checked_in_at: status === "present" || status === "late" ? at : null,
      };
      if (record) Object.assign(record, patch);
      else {
        record = {
          id: randomUUID(),
          teacher_id: this.teacherId,
          attendance_session_id: session.id,
          student_id: studentId,
          ...patch,
        };
        s.attendance_records.push(record);
      }
      return { record, created: true };
    });
  }
  async checkIn(
    studentId: string,
    periodId: string,
    date: string,
    uid: string,
    at: string,
  ) {
    return this.attendance(
      studentId,
      periodId,
      date,
      "present",
      "rfid",
      at,
      uid,
    );
  }
  async replaceTag(studentId: string, uid: string) {
    if (!isDemo()) {
      const { error } = await admin().rpc("replace_tag", {
        p_teacher: this.teacherId,
        p_student: studentId,
        p_uid: uid,
      });
      if (error) throw error;
      return;
    }
    return demoTransaction((s) => {
      const conflict = s.rfid_tags.find(
        (t) => t.uid === uid && t.student_id !== studentId,
      );
      if (conflict)
        throw new Error("This tag is already assigned to another student.");
      s.rfid_tags
        .filter((t) => t.student_id === studentId)
        .forEach((t) => (t.active = false));
      const existing = s.rfid_tags.find((t) => t.uid === uid);
      if (existing) {
        existing.active = true;
        existing.assigned_at = new Date().toISOString();
      } else
        s.rfid_tags.push({
          id: randomUUID(),
          teacher_id: this.teacherId,
          student_id: studentId,
          uid,
          active: true,
          assigned_at: new Date().toISOString(),
        });
    });
  }
}
