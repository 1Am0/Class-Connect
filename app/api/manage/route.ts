import { z } from "zod";
import { randomBytes, randomUUID } from "node:crypto";
import {
  teacherStore,
  apiError,
  sameOrigin,
  hashKey,
  HttpError,
} from "@/lib/server/auth";
import { normalizeUid } from "@/lib/core";
import { bellScheduleError } from "@/lib/bell-schedule";
import {
  firstAssignedBellTime,
  weeklyScheduleError,
} from "@/lib/weekly-schedule";
import { homeClassesInput } from "@/lib/server/home-preferences";
import { isDemo } from "@/lib/server/config";
import { admin } from "@/lib/server/supabase";
import {
  schoolEmailFromStudentId,
  schoolStudentIdError,
} from "@/lib/school-student-id";
const id = z.string().uuid(),
  name = z.string().trim().min(1).max(100),
  time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const attendanceValue = z.object({
  status: z.enum(["present", "absent", "late", "excused"]),
  source: z.enum(["manual", "rfid", "qr"]),
  checked_in_at: z.iso.datetime({ offset: true }).nullable(),
});
const attendanceVersion = attendanceValue.extend({ id });
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("student"),
    id: id.optional(),
    first_name: name,
    last_name: name,
    display_name: name,
    school_student_id: z.string().trim().nullable().optional(),
    optional_notes: z.string().max(500).default(""),
    active: z.boolean().default(true),
  }),
  z.object({
    action: z.literal("period"),
    id: id.optional(),
    name,
    period_number: z.number().int().min(1).max(20),
    start_time: time,
    end_time: time,
    active: z.boolean().default(true),
    time_source: z.enum(["school", "custom"]).default("custom"),
  }),
  z.object({
    action: z.literal("classLifecycle"),
    id,
    operation: z.enum(["archive", "restore"]),
  }),
  z.object({
    action: z.literal("bellSchedule"),
    bell_schedule: z
      .array(
        z.object({
          period_number: z.number().int().min(1).max(20),
          start_time: time,
          end_time: time,
        }),
      )
      .max(20),
    update_existing: z.boolean(),
  }),
  z.object({
    action: z.literal("weeklySchedule"),
    presets: z
      .array(
        z.object({
          id,
          name: z.string().trim().min(1).max(60),
          periods: z
            .array(
              z.object({
                period_number: z.number().int().min(1).max(20),
                start_time: time,
                end_time: time,
              }),
            )
            .max(20),
        }),
      )
      .max(20),
    assignments: z.record(
      z.enum(["monday", "tuesday", "wednesday", "thursday", "friday"]),
      id,
    ),
    expected_version: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("membership"),
    student_id: id,
    period_id: id,
    remove: z.boolean().default(false),
  }),
  z.object({
    action: z.literal("attendance"),
    student_id: id,
    period_id: id,
    date: z.iso.date(),
    status: z.enum(["present", "absent", "late", "excused"]),
    expected: attendanceVersion.nullable().optional(),
    restore: attendanceValue.optional(),
  }),
  z.object({
    action: z.literal("attendanceBatch"),
    period_id: id,
    date: z.iso.date(),
    status: z.enum(["present", "absent", "late", "excused"]),
    students: z
      .array(
        z.object({ student_id: id, expected: attendanceVersion.nullable() }),
      )
      .min(1)
      .max(100),
  }),
  z.object({
    action: z.literal("tag"),
    student_id: id,
    uid: z.string().max(40),
    device_id: id.optional(),
  }),
  z.object({
    action: z.literal("enrollment"),
    device_id: id,
    enabled: z.boolean(),
    expected_until: z.iso.datetime().optional(),
  }),
  z.object({
    action: z.literal("device"),
    device_name: name,
    device_identifier: z.string().regex(/^[a-zA-Z0-9_-]{3,100}$/),
  }),
  z.object({
    action: z.literal("deviceActive"),
    device_id: id,
    active: z.boolean(),
  }),
  z.object({
    action: z.literal("settings"),
    name: name.optional(),
    timezone: z.string().optional(),
    override_period_id: id.nullable().optional(),
  }),
  homeClassesInput.extend({ action: z.literal("homeClasses") }),
  z.object({
    action: z.literal("studentData"),
    operation: z.enum(["archive", "clear_tags", "delete_all"]),
    confirmation: z.string(),
  }),
]);
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const store = await teacherStore(),
      b = schema.parse(await req.json()),
      s = await store.snapshot();
    const student = (value: string) => {
      if (!s.students.some((x) => x.id === value))
        throw new HttpError(404, "Student not found.");
    };
    const period = (value: string) => {
      if (!s.periods.some((x) => x.id === value))
        throw new HttpError(404, "Period not found.");
    };
    const device = (value: string) => {
      if (!s.devices.some((x) => x.id === value))
        throw new HttpError(404, "Scanner not found.");
    };
    switch (b.action) {
      case "student": {
        if (b.id) student(b.id);
        const existing = b.id
          ? s.students.find((value) => value.id === b.id)
          : null;
        const schoolId =
          b.school_student_id ?? existing?.school_student_id ?? null;
        if (schoolId && schoolStudentIdError(schoolId))
          throw new HttpError(400, schoolStudentIdError(schoolId)!);
        if (!schoolId && !b.id)
          throw new HttpError(
            400,
            "Enter a six-digit School ID for the new student.",
          );
        const schoolEmail = schoolId
          ? schoolEmailFromStudentId(schoolId)
          : (existing?.school_email ?? null);
        if (
          schoolId &&
          s.students.some(
            (value) =>
              value.id !== b.id && value.school_student_id === schoolId,
          )
        )
          throw new HttpError(
            409,
            "This School ID already belongs to another student.",
          );
        const { action, ...v } = b;
        void action;
        const savedId = await store.save("students", {
          ...v,
          school_student_id: schoolId,
          school_email: schoolEmail,
        });
        return Response.json({ success: true, id: savedId });
      }
      case "period": {
        if (b.id) period(b.id);
        const existing = b.id ? s.periods.find((p) => p.id === b.id) : null;
        if (existing && existing.active !== b.active)
          throw new HttpError(
            400,
            "Use Manage classes to archive or restore a class.",
          );
        const bellTime = firstAssignedBellTime(s.teacher, b.period_number);
        if (b.time_source === "school" && !bellTime)
          throw new HttpError(
            400,
            "Set a bell time for this period in Settings first.",
          );
        const startTime =
          b.time_source === "school" ? bellTime!.start_time : b.start_time;
        const endTime =
          b.time_source === "school" ? bellTime!.end_time : b.end_time;
        if (endTime <= startTime)
          throw new Error("End time must be after start time.");
        if (
          s.periods.some(
            (p) =>
              p.id !== b.id &&
              p.active &&
              b.active &&
              p.period_number === b.period_number,
          )
        )
          throw new Error("Another active class uses this period number.");
        const { action, ...v } = b;
        void action;
        const { time_source: _timeSource, ...legacyValues } = v;
        void _timeSource;
        const savedId = await store.save("periods", {
          // Older production databases can still save custom classes before
          // the bell-schedule migration is applied.
          ...(!s.demo && !("bell_schedule" in s.teacher) ? legacyValues : v),
          start_time: startTime,
          end_time: endTime,
        });
        return Response.json({ success: true, id: savedId });
      }
      case "classLifecycle": {
        period(b.id);
        const scannerReset = await store.setClassActive(
          b.id,
          b.operation === "restore",
        );
        return Response.json({ success: true, scannerReset });
      }
      case "bellSchedule": {
        if ("weekly_schedule_version" in s.teacher)
          throw new HttpError(
            409,
            "Use Weekly schedule to change school times.",
          );
        if (!s.demo && !("bell_schedule" in s.teacher))
          throw new HttpError(
            409,
            "School schedule needs database migration 003 before it can be saved.",
          );
        const scheduleError = bellScheduleError(b.bell_schedule);
        if (scheduleError) throw new HttpError(400, scheduleError);
        await store.bellSchedule(b.bell_schedule, b.update_existing);
        break;
      }
      case "weeklySchedule": {
        if (!("weekly_schedule_version" in s.teacher))
          throw new HttpError(
            409,
            "Weekly schedule needs database migration 008 before it can be saved.",
          );
        const error = weeklyScheduleError(b.presets, b.assignments);
        if (error) throw new HttpError(400, error);
        let version: number;
        try {
          version = await store.weeklySchedule(
            b.presets,
            b.assignments,
            b.expected_version,
          );
        } catch (caught) {
          const message = caught instanceof Error ? caught.message : "";
          if (message.includes("Schedule changed elsewhere"))
            throw new HttpError(
              409,
              "Schedule changed elsewhere. Reload and try again.",
            );
          if (message.includes("migration 008"))
            throw new HttpError(409, message);
          throw caught;
        }
        return Response.json({ success: true, version });
      }
      case "membership":
        student(b.student_id);
        period(b.period_id);
        if (!s.periods.find((p) => p.id === b.period_id)?.active)
          throw new HttpError(
            409,
            "Restore this class before changing its roster.",
          );
        if (b.remove) await store.removeMembership(b.student_id, b.period_id);
        else if (
          !s.period_students.some(
            (m) => m.student_id === b.student_id && m.period_id === b.period_id,
          )
        )
          await store.save("period_students", {
            student_id: b.student_id,
            period_id: b.period_id,
          });
        break;
      case "attendance":
        student(b.student_id);
        period(b.period_id);
        if (
          !s.periods.find((p) => p.id === b.period_id)?.active &&
          !s.attendance_sessions.some(
            (session) =>
              session.period_id === b.period_id && session.date === b.date,
          )
        )
          throw new HttpError(
            409,
            "Archived classes can only edit existing attendance history.",
          );
        if (b.expected !== undefined) {
          const existing = s.attendance_sessions.find(
            (x) => x.period_id === b.period_id && x.date === b.date,
          );
          if (
            !s.attendance_records.some(
              (r) =>
                r.attendance_session_id === existing?.id &&
                r.student_id === b.student_id,
            ) &&
            !s.period_students.some(
              (m) =>
                m.period_id === b.period_id &&
                m.student_id === b.student_id &&
                s.students.some((st) => st.id === m.student_id && st.active),
            )
          )
            throw new HttpError(
              409,
              "This student is not enrolled in the selected class.",
            );
          const result = await store.editAttendance(
            b.student_id,
            b.period_id,
            b.date,
            b.status,
            b.restore,
          );
          return Response.json({ success: true, ...result });
        }
        if (b.restore)
          throw new HttpError(
            400,
            "Undo needs the expected attendance record.",
          );
        await store.attendance(
          b.student_id,
          b.period_id,
          b.date,
          b.status,
          "manual",
          new Date().toISOString(),
        );
        break;
      case "attendanceBatch": {
        period(b.period_id);
        const session = s.attendance_sessions.find(
          (x) => x.period_id === b.period_id && x.date === b.date,
        );
        if (!session && !s.periods.find((p) => p.id === b.period_id)?.active)
          throw new HttpError(
            409,
            "Archived classes can only edit existing attendance history.",
          );
        if (
          new Set(b.students.map((st) => st.student_id)).size !==
          b.students.length
        )
          throw new HttpError(400, "Select each student only once.");
        const results = [];
        for (const item of b.students) {
          try {
            student(item.student_id);
            if (
              !s.attendance_records.some(
                (r) =>
                  r.attendance_session_id === session?.id &&
                  r.student_id === item.student_id,
              ) &&
              !s.period_students.some(
                (m) =>
                  m.period_id === b.period_id &&
                  m.student_id === item.student_id &&
                  s.students.some((st) => st.id === m.student_id && st.active),
              )
            )
              throw new Error("Student is not enrolled in this class.");
            const result = await store.editAttendance(
              item.student_id,
              b.period_id,
              b.date,
              b.status,
            );
            results.push({
              student_id: item.student_id,
              success: true,
              ...result,
            });
          } catch (error) {
            results.push({
              student_id: item.student_id,
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Could not save this student. Refresh and try again.",
            });
          }
        }
        return Response.json({ success: true, results });
      }
      case "tag":
        student(b.student_id);
        if (b.device_id) device(b.device_id);
        await store.replaceTag(b.student_id, normalizeUid(b.uid));
        if (b.device_id)
          await store.save("devices", { id: b.device_id, pending_uid: null });
        break;
      case "enrollment": {
        device(b.device_id);
        if (!b.enabled) {
          await store.endEnrollment(b.device_id, b.expected_until);
          break;
        }
        if (!s.devices.find((d) => d.id === b.device_id)?.active)
          throw new Error("Turn on this scanner before adding a card.");
        const enrollment_until = new Date(
          Date.now() + 10 * 60000,
        ).toISOString();
        await store.save("devices", {
          id: b.device_id,
          enrollment_until,
          pending_uid: null,
        });
        return Response.json({ success: true, enrollment_until });
      }
      case "device": {
        if (isDemo())
          throw new Error(
            "Configure real scanners after connecting Supabase. The local demo scanner is already available.",
          );
        const secret = randomBytes(32).toString("hex");
        const { error } = await admin()
          .from("devices")
          .insert({
            teacher_id: store.teacherId,
            device_name: b.device_name,
            device_identifier: b.device_identifier,
            hashed_api_key: hashKey(secret),
          });
        if (error) throw error;
        return Response.json({ success: true, secret });
      }
      case "deviceActive":
        device(b.device_id);
        await store.save("devices", { id: b.device_id, active: b.active });
        break;
      case "settings": {
        if (b.override_period_id) {
          period(b.override_period_id);
          if (!s.periods.find((p) => p.id === b.override_period_id)?.active)
            throw new HttpError(
              409,
              "Choose an active class for scanner taps.",
            );
        }
        if (b.timezone)
          new Intl.DateTimeFormat("en-US", { timeZone: b.timezone }).format();
        const { action, ...v } = b;
        void action;
        await store.settings(v);
        break;
      }
      case "homeClasses": {
        if (!s.demo && !("home_class_preferences" in s.teacher))
          throw new HttpError(
            409,
            "Class ordering needs database migration 005 before it can be saved.",
          );
        const owned = new Set(s.periods.map((item) => item.id));
        if (b.order.some((classId) => !owned.has(classId)))
          throw new HttpError(400, "Choose classes from your own classroom.");
        await store.settings({
          home_class_preferences: { order: b.order },
        });
        break;
      }
      case "studentData": {
        const phrase =
          b.operation === "archive"
            ? "ARCHIVE STUDENTS"
            : b.operation === "clear_tags"
              ? "CLEAR RFID CARDS"
              : "DELETE ALL STUDENT DATA";
        if (b.confirmation !== phrase)
          throw new HttpError(400, "Type the confirmation phrase exactly.");
        const counts = await store.manageStudentData(b.operation);
        return Response.json({ success: true, counts });
      }
    }
    return Response.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
