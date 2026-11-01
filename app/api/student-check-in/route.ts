import { cookies } from "next/headers";
import { z } from "zod";
import { apiError, HttpError, sameOrigin } from "@/lib/server/auth";
import { admin } from "@/lib/server/supabase";
import {
  studentGoogleConfig,
  verifyStudentGoogleCredential,
} from "@/lib/server/student-google";
import {
  CHECK_IN_COOKIE,
  checkInName,
  classCheckInWindow,
  otherStudentOnDevice,
  readCheckInMarks,
  studentForSchoolEmail,
  verifyCheckInPass,
  writeCheckInMarks,
} from "@/lib/student-checkin";
import { schoolEmailFromStudentId } from "@/lib/school-student-id";
import type { Period, Teacher } from "@/types";

// A student proves who they are with their school ID, or, when the school
// allows the Google client, with their school Google account.
const requestSchema = z.union([
  z.object({
    pass: z.string().max(200),
    credential: z.string().min(100).max(10000),
  }),
  z.object({
    pass: z.string().max(200),
    studentId: z
      .string()
      .trim()
      .regex(/^\d{6}$/),
  }),
]);

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = requestSchema.safeParse(await request.json());
    if (!body.success)
      throw new HttpError(
        400,
        "Enter your six-digit student ID (for example, 123456).",
      );
    const { pass } = body.data;
    const secret = process.env.QR_CHECKIN_SECRET ?? "";
    if (secret.length < 32)
      throw new HttpError(503, "Student check-in is not configured yet.");
    const qr = verifyCheckInPass(pass, secret);
    if (!qr)
      throw new HttpError(
        400,
        "This QR code is invalid. Scan the code shown by your teacher.",
      );
    if (qr.expired)
      throw new HttpError(
        410,
        "This check-in page timed out. Scan the code on the board again.",
      );
    const db = admin();
    const { data: period, error: classError } = await db
      .from("periods")
      .select("*")
      .eq("id", qr.periodId)
      .eq("active", true)
      .maybeSingle();
    if (classError) throw classError;
    if (!period) throw new HttpError(404, "This class is no longer available.");
    const { data: teacher, error: teacherError } = await db
      .from("teachers")
      .select("*")
      .eq("id", period.teacher_id)
      .single();
    if (teacherError) throw teacherError;
    const window = classCheckInWindow(teacher as Teacher, period as Period);
    if (qr.date !== window.date)
      throw new HttpError(
        410,
        "This QR code is from another day. Scan today's code.",
      );
    if (!window.open)
      throw new HttpError(
        403,
        "Check-in opens only during this class's scheduled time.",
      );

    let email: string;
    if ("credential" in body.data) {
      if (!studentGoogleConfig())
        throw new HttpError(503, "Google check-in is not set up.");
      let identity: Awaited<ReturnType<typeof verifyStudentGoogleCredential>>;
      try {
        identity = await verifyStudentGoogleCredential(body.data.credential);
      } catch {
        throw new HttpError(
          401,
          "Google could not verify this account. Sign in with your school account and try again.",
        );
      }
      if (!identity)
        throw new HttpError(
          401,
          "Use your school's Google account to check in.",
        );
      email = identity.email;
    } else email = schoolEmailFromStudentId(body.data.studentId)!;
    const { data: students, error: studentError } = await db
      .from("students")
      .select("id,school_email,active,first_name,last_name")
      .eq("teacher_id", teacher.id)
      .eq("school_email", email)
      .eq("active", true);
    if (studentError) throw studentError;
    const { data: memberships, error: membershipError } = await db
      .from("period_students")
      .select("student_id,period_id")
      .eq("teacher_id", teacher.id)
      .eq("period_id", period.id);
    if (membershipError) throw membershipError;
    const student = studentForSchoolEmail(
      students,
      memberships,
      email,
      period.id,
    );
    if (!student)
      throw new HttpError(
        403,
        "credential" in body.data
          ? "This school account is not linked to a student in this class. Ask your teacher to add your school email."
          : "That ID isn’t on this class’s roster. Check the number, or ask your teacher.",
      );
    // One phone checks in one student per class per day.
    const jar = await cookies();
    const marks = readCheckInMarks(jar.get(CHECK_IN_COOKIE)?.value, secret);
    if (otherStudentOnDevice(marks, period.id, qr.date, student.id))
      throw new HttpError(
        409,
        "This phone already checked in a student to this class today. Each student checks in on their own phone.",
      );
    const receivedAt = new Date();
    const currentWindow = classCheckInWindow(
      teacher as Teacher,
      period as Period,
      receivedAt,
    );
    if (qr.date !== currentWindow.date || !currentWindow.open)
      throw new HttpError(
        403,
        "Check-in has closed for this class. Ask your teacher for help.",
      );
    const { data, error } = await db.rpc("qr_student_checkin", {
      p_teacher: teacher.id,
      p_period: period.id,
      p_student: student.id,
      p_date: currentWindow.date,
      p_at: receivedAt.toISOString(),
    });
    if (error) {
      if (error.code === "PGRST202")
        throw new HttpError(
          503,
          "QR check-in needs database migration 011 before it can save attendance.",
        );
      throw error;
    }
    jar.set(
      CHECK_IN_COOKIE,
      writeCheckInMarks(
        marks,
        { periodId: period.id, date: qr.date, studentId: student.id },
        secret,
      ),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/student-check-in",
        maxAge: 60 * 60 * 24,
      },
    );
    const match = students.find((item) => item.id === student.id);
    return Response.json(
      {
        success: true,
        alreadyCheckedIn: data.already_checked_in,
        status: data.record.status,
        name: match ? checkInName(match.first_name, match.last_name) : "",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
