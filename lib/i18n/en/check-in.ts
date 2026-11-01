import type { Namespace } from "../translate";

// The student check-in page opened from the class QR code.
export default {
  pageTitle: "Student check-in · Class Connect",
  scanFirst: "Scan the QR code shown by your teacher to open check-in.",
  invalid: "This QR code is invalid. Scan the code shown by your teacher.",
  changed: "This QR code has changed. Scan the code on the board again.",
  failed: "Could not check in. Try again.",
  noGoogleCredential: "Google did not provide a sign-in. Try again.",
  googleLoadFailed:
    "Google sign-in did not load. Check your connection and try again.",
  checkedIn: "You’re checked in",
  checkedInName: "You’re checked in, {name}",
  already: "Already checked in",
  otherStatus: "Attendance already marked",
  checkedInBody: "Your teacher can see your attendance.",
  alreadyBody: "Your attendance was already marked for this class.",
  otherBody: "Your teacher has already set your attendance status.",
  title: "Check in to class",
  googleIntro:
    "Use the school Google account your teacher added to the class roster.",
  idIntro: "Enter your six-digit student ID to check in.",
  idError: "Enter your six-digit student ID (for example, 123456).",
  studentId: "Student ID",
  checkingIn: "Checking in…",
  checkIn: "Check in",
  googleLabel: "Sign in with school Google account",
  checkingYouIn: "Checking you in…",
} satisfies Namespace;
