import test from "node:test";
import assert from "node:assert/strict";
import {
  createCheckInPass,
  createQrToken,
  QR_ROTATE_SECONDS,
  verifyCheckInPass,
  verifyQrToken,
  classCheckInWindow,
  schoolIdentityFromClaims,
  studentForSchoolEmail,
} from "../lib/student-checkin";
import { demoSeed } from "../lib/demo-seed";

test("class QR code changes every few seconds and expires soon after", () => {
  const secret = "a".repeat(40);
  const period = "11111111-1111-4111-8111-111111111111";
  const shown = Date.UTC(2026, 9, 23, 16, 0, 5);
  const token = createQrToken(period, "2026-10-23", secret, shown);
  assert.notEqual(
    createQrToken(
      period,
      "2026-10-23",
      secret,
      shown + QR_ROTATE_SECONDS * 1000,
    ),
    token,
  );
  assert.deepEqual(verifyQrToken(token, secret, shown), {
    periodId: period,
    date: "2026-10-23",
    expired: false,
  });
  // Still scannable for a little while after it leaves the board.
  assert.equal(verifyQrToken(token, secret, shown + 50_000)?.expired, false);
  assert.equal(verifyQrToken(token, secret, shown + 90_000)?.expired, true);
  assert.equal(verifyQrToken(token, secret, shown - 30_000)?.expired, true);
  assert.equal(verifyQrToken(`${token}a`, secret, shown), null);
  assert.equal(verifyQrToken(token, "b".repeat(40), shown), null);
});

test("a check-in pass lasts five minutes and is not a QR code", () => {
  const secret = "a".repeat(40);
  const period = "11111111-1111-4111-8111-111111111111";
  const now = Date.UTC(2026, 9, 23, 16, 0, 0);
  const pass = createCheckInPass(period, "2026-10-23", secret, now);
  assert.equal(
    verifyCheckInPass(pass, secret, now + 4 * 60_000)?.expired,
    false,
  );
  assert.equal(
    verifyCheckInPass(pass, secret, now + 6 * 60_000)?.expired,
    true,
  );
  // The two kinds are signed differently, so one can't stand in for the other.
  assert.equal(verifyQrToken(pass, secret, now), null);
  const qr = createQrToken(period, "2026-10-23", secret, now);
  assert.equal(verifyCheckInPass(qr, secret, now), null);
});

test("school Google claims require the configured audience and hosted domain", () => {
  const claims = {
    iss: "https://accounts.google.com",
    aud: "student-client",
    exp: Math.floor(Date.now() / 1000) + 100,
    sub: "google-subject",
    email: "STUDENT@SCHOOL.EDU",
    email_verified: true,
    hd: "school.edu",
  };
  assert.deepEqual(
    schoolIdentityFromClaims(claims, "student-client", "school.edu"),
    {
      email: "student@school.edu",
      subject: "google-subject",
    },
  );
  assert.equal(
    schoolIdentityFromClaims(
      { ...claims, hd: "gmail.com" },
      "student-client",
      "school.edu",
    ),
    null,
  );
  assert.equal(
    schoolIdentityFromClaims(
      { ...claims, aud: "other-client" },
      "student-client",
      "school.edu",
    ),
    null,
  );
  assert.equal(
    schoolIdentityFromClaims(
      { ...claims, email_verified: false },
      "student-client",
      "school.edu",
    ),
    null,
  );
});

test("school email domain and Google hosted domain can differ", () => {
  const claims = {
    iss: "https://accounts.google.com",
    aud: "student-client",
    exp: Math.floor(Date.now() / 1000) + 100,
    sub: "google-subject",
    email: "123456@students.example.edu",
    email_verified: true,
    hd: "example.edu",
  };
  assert.deepEqual(
    schoolIdentityFromClaims(
      claims,
      "student-client",
      "students.example.edu",
      "example.edu",
    ),
    {
      email: "123456@students.example.edu",
      subject: "google-subject",
    },
  );
});

test("check-in window uses the school timezone and assigned weekly preset", () => {
  const state = demoSeed();
  const period = state.periods[0];
  assert.equal(
    classCheckInWindow(state.teacher, period, new Date("2026-10-23T14:45:00Z"))
      .open,
    true,
  );
  assert.equal(
    classCheckInWindow(state.teacher, period, new Date("2026-10-23T15:25:00Z"))
      .open,
    false,
  );
  assert.equal(
    classCheckInWindow(state.teacher, period, new Date("2026-10-25T14:45:00Z"))
      .open,
    false,
  );
  assert.equal(
    classCheckInWindow(state.teacher, { ...period, active: false }, new Date())
      .open,
    false,
  );
});

test("roster matching requires an exact email and membership in the QR class", () => {
  const students = [
    {
      id: "a",
      teacher_id: "t",
      school_email: "first@school.edu",
      active: true,
    },
    {
      id: "b",
      teacher_id: "t",
      school_email: "second@school.edu",
      active: true,
    },
  ];
  const memberships = [
    { student_id: "a", period_id: "p" },
    { student_id: "b", period_id: "other" },
  ];
  assert.equal(
    studentForSchoolEmail(students, memberships, "FIRST@SCHOOL.EDU", "p")?.id,
    "a",
  );
  assert.equal(
    studentForSchoolEmail(students, memberships, "second@school.edu", "p"),
    null,
  );
});

test("a phone remembers today's check-ins in a signed cookie", async () => {
  const { readCheckInMarks, writeCheckInMarks, otherStudentOnDevice } =
    await import("../lib/student-checkin");
  const secret = "s".repeat(40);
  const period = "11111111-1111-4111-8111-111111111111";
  const classmate = "22222222-2222-4222-8222-222222222222";
  const friend = "33333333-3333-4333-8333-333333333333";
  const cookie = writeCheckInMarks(
    [],
    { periodId: period, date: "2026-10-27", studentId: classmate },
    secret,
  );
  const marks = readCheckInMarks(cookie, secret);
  assert.deepEqual(marks, [
    { periodId: period, date: "2026-10-27", studentId: classmate },
  ]);
  // The same student again is fine; a second student on this phone is not.
  assert.equal(
    otherStudentOnDevice(marks, period, "2026-10-27", classmate),
    null,
  );
  assert.ok(otherStudentOnDevice(marks, period, "2026-10-27", friend));
  // Another class or another day is a fresh start.
  assert.equal(
    otherStudentOnDevice(
      marks,
      "44444444-4444-4444-8444-444444444444",
      "2026-10-27",
      friend,
    ),
    null,
  );
  assert.equal(otherStudentOnDevice(marks, period, "2026-10-28", friend), null);
  // Yesterday's marks drop off when today's is written.
  const next = writeCheckInMarks(
    marks,
    { periodId: period, date: "2026-10-28", studentId: friend },
    secret,
  );
  assert.equal(readCheckInMarks(next, secret).length, 1);
});

test("a forged or tampered check-in cookie is ignored", async () => {
  const { readCheckInMarks, writeCheckInMarks } =
    await import("../lib/student-checkin");
  const secret = "s".repeat(40);
  const cookie = writeCheckInMarks(
    [],
    {
      periodId: "11111111-1111-4111-8111-111111111111",
      date: "2026-10-27",
      studentId: "22222222-2222-4222-8222-222222222222",
    },
    secret,
  );
  assert.equal(readCheckInMarks(cookie, "t".repeat(40)).length, 0);
  assert.equal(
    readCheckInMarks(cookie.replace("2026", "2025"), secret).length,
    0,
  );
  assert.equal(readCheckInMarks("garbage~more!junk", secret).length, 0);
  assert.equal(readCheckInMarks(undefined, secret).length, 0);
});

test("the confirmation shows a first name and last initial only", async () => {
  const { checkInName } = await import("../lib/student-checkin");
  assert.equal(checkInName("Ada", "lovelace"), "Ada L.");
  assert.equal(checkInName(" Grace ", ""), "Grace");
});
