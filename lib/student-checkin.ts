import { createHmac, timingSafeEqual } from "node:crypto";
import type { Membership, Period, Student, Teacher } from "@/types";
import { schoolClock } from "./core";
import { effectiveTimeFor } from "./weekly-schedule";

const periodPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

/** The class QR code changes this often while it is on screen. */
export const QR_ROTATE_SECONDS = 20;
// A scanned code still opens check-in for two more turns (40–60 seconds),
// long enough to scan but too short to pass a photo around.
const qrGraceSlots = 2;
// Once opened, the check-in page has five minutes to send a student ID.
const passSeconds = 5 * 60;

function signed(kind: string, payload: string, secret: string) {
  return createHmac("sha256", secret).update(`${kind}:${payload}`).digest();
}

function create(
  kind: string,
  periodId: string,
  date: string,
  number: number,
  secret: string,
) {
  if (
    !periodPattern.test(periodId) ||
    !datePattern.test(date) ||
    secret.length < 32
  )
    throw new Error("QR check-in is not configured.");
  const payload = `${periodId.toLowerCase()}.${date}.${number}`;
  return `${payload}.${signed(kind, payload, secret).toString("hex")}`;
}

function verify(kind: string, token: string, secret: string) {
  const match =
    /^([0-9a-f-]{36})\.(\d{4}-\d{2}-\d{2})\.(\d{1,12})\.([0-9a-f]{64})$/i.exec(
      token,
    );
  if (!match || !periodPattern.test(match[1]) || secret.length < 32)
    return null;
  const expected = signed(
    kind,
    `${match[1].toLowerCase()}.${match[2]}.${match[3]}`,
    secret,
  );
  const supplied = Buffer.from(match[4], "hex");
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return null;
  return {
    periodId: match[1].toLowerCase(),
    date: match[2],
    number: Number(match[3]),
  };
}

const qrSlot = (now: number) => Math.floor(now / 1000 / QR_ROTATE_SECONDS);

/** The code shown on the board right now for one class and school date. */
export function createQrToken(
  periodId: string,
  date: string,
  secret: string,
  now = Date.now(),
) {
  return create("qr", periodId, date, qrSlot(now), secret);
}

/** A scanned code: null when forged, `expired` when it left the board too long ago. */
export function verifyQrToken(token: string, secret: string, now = Date.now()) {
  const qr = verify("qr", token, secret);
  if (!qr) return null;
  const age = qrSlot(now) - qr.number;
  return {
    periodId: qr.periodId,
    date: qr.date,
    expired: age < 0 || age > qrGraceSlots,
  };
}

/** What the check-in page sends back with the student ID. */
export function createCheckInPass(
  periodId: string,
  date: string,
  secret: string,
  now = Date.now(),
) {
  return create(
    "pass",
    periodId,
    date,
    Math.floor(now / 1000) + passSeconds,
    secret,
  );
}

export function verifyCheckInPass(
  token: string,
  secret: string,
  now = Date.now(),
) {
  const pass = verify("pass", token, secret);
  if (!pass) return null;
  return {
    periodId: pass.periodId,
    date: pass.date,
    expired: Math.floor(now / 1000) > pass.number,
  };
}

export function classCheckInWindow(
  teacher: Teacher,
  period: Period,
  now = new Date(),
) {
  const { date, time } = schoolClock(teacher.timezone, now);
  const scheduled = effectiveTimeFor(teacher, period, date);
  return {
    date,
    open: Boolean(
      period.active &&
      scheduled &&
      scheduled.start_time <= time &&
      time < scheduled.end_time,
    ),
    scheduled,
  };
}

export function schoolIdentityFromClaims(
  claims: Record<string, unknown>,
  audience: string,
  domain: string,
  googleHostedDomain = domain,
) {
  const email =
    typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  const hostedDomain =
    typeof claims.hd === "string" ? claims.hd.toLowerCase() : "";
  if (
    !["accounts.google.com", "https://accounts.google.com"].includes(
      String(claims.iss),
    ) ||
    claims.aud !== audience ||
    typeof claims.exp !== "number" ||
    claims.exp <= Math.floor(Date.now() / 1000) ||
    claims.email_verified !== true ||
    hostedDomain !== googleHostedDomain.toLowerCase() ||
    !email.endsWith(`@${domain.toLowerCase()}`) ||
    typeof claims.sub !== "string" ||
    !claims.sub
  )
    return null;
  return { email, subject: claims.sub };
}

export function studentForSchoolEmail(
  students: Pick<Student, "id" | "school_email" | "active">[],
  memberships: Pick<Membership, "student_id" | "period_id">[],
  email: string,
  periodId: string,
) {
  const enrolled = new Set(
    memberships
      .filter((m) => m.period_id === periodId)
      .map((m) => m.student_id),
  );
  const matches = students.filter(
    (student) =>
      student.active &&
      enrolled.has(student.id) &&
      student.school_email?.toLowerCase() === email.trim().toLowerCase(),
  );
  return matches.length === 1 ? matches[0] : null;
}

/**
 * Phones remember, in a signed cookie, which student they checked in to
 * which class today. One phone checks in one student per class per day, so a
 * student can't sit at home checking in friends from one device.
 */
export const CHECK_IN_COOKIE = "class_connect_checkins";
const markPattern = /^([0-9a-f-]{36})\.(\d{4}-\d{2}-\d{2})\.([0-9a-f-]{36})$/i;

function markSignature(mark: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`device-checkin:${mark}`)
    .digest("hex")
    .slice(0, 32);
}

export interface CheckInMark {
  periodId: string;
  date: string;
  studentId: string;
}

export function readCheckInMarks(
  cookie: string | undefined,
  secret: string,
): CheckInMark[] {
  if (!cookie || secret.length < 32) return [];
  const marks: CheckInMark[] = [];
  for (const entry of cookie.split("~").slice(0, 20)) {
    const [mark, signature] = entry.split("!");
    const match = markPattern.exec(mark ?? "");
    const expected = match ? markSignature(mark, secret) : "";
    if (
      !match ||
      !signature ||
      signature.length !== expected.length ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      continue;
    marks.push({
      periodId: match[1].toLowerCase(),
      date: match[2],
      studentId: match[3].toLowerCase(),
    });
  }
  return marks;
}

/** The student this phone already checked in to this class today, if any. */
export function otherStudentOnDevice(
  marks: CheckInMark[],
  periodId: string,
  date: string,
  studentId: string,
) {
  return (
    marks.find(
      (mark) =>
        mark.periodId === periodId &&
        mark.date === date &&
        mark.studentId !== studentId,
    ) ?? null
  );
}

/** Today's marks plus this one; older days drop off. */
export function writeCheckInMarks(
  marks: CheckInMark[],
  add: CheckInMark,
  secret: string,
) {
  const kept = marks.filter(
    (mark) =>
      mark.date === add.date &&
      !(mark.periodId === add.periodId && mark.studentId === add.studentId),
  );
  return [...kept, add]
    .slice(-12)
    .map((mark) => {
      const text = `${mark.periodId}.${mark.date}.${mark.studentId}`;
      return `${text}!${markSignature(text, secret)}`;
    })
    .join("~");
}

/** "Ada L." — enough to catch a mistyped ID without showing full names. */
export function checkInName(firstName: string, lastName: string) {
  const initial = lastName.trim().charAt(0);
  return `${firstName.trim()}${initial ? ` ${initial.toUpperCase()}.` : ""}`;
}
