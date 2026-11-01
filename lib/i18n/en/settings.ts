import type { Namespace } from "../translate";

// Settings: appearance and sound, attendance tools, school day and student data.
export default {
  sections: "Settings sections",
  navAppearance: "Appearance",
  navAttendance: "Attendance",
  navClassroom: "Account & school day",
  navData: "Student data",
  appearance: "Appearance",
  theme: "Theme",
  themeLight: "Light",
  themeDark: "Dark",
  themeSystem: "System",
  language: "Language",
  languageHint: "Saved in this browser.",
  reducedMotion: "Reduced motion",
  reducedMotionHint:
    "Use shorter animations. Your system preference is always respected.",
  attendance: "Attendance",
  attendanceIntro:
    "Optional tools for the class roster. Saved in this browser.",
  notes: "Attendance notes",
  notesHint:
    "Add a short reason to a student’s mark, like “nurse” or “parent called”. Notes are saved with attendance and included in Export CSV.",
  shortcuts: "Keyboard shortcuts",
  shortcutsHint:
    "On the roster: ↑ ↓ or J K move between students, P A L E mark them and move on, N adds a note, / finds a student, Ctrl+Z steps back through your changes.",
  timezoneTitle: "School timezone",
  saved: "Settings saved.",
  commonTimezones: "Common timezones",
  tzPacific: "Pacific time (Los Angeles)",
  tzMountain: "Mountain time (Denver)",
  tzCentral: "Central time (Chicago)",
  tzEastern: "Eastern time (New York)",
  tzHawaii: "Hawaii time",
  tzLondon: "United Kingdom (London)",
  tzUtc: "Coordinated Universal Time",
  timezoneHint:
    "Attendance dates and automatic period selection use this timezone.",
  savePreferences: "Save preferences",
  demoPrivacy:
    "Local demo data stays on this computer. Production requires Supabase and a teacher login.",
  privacy: "Your classroom records are restricted to your teacher account.",
  editSchedule: "Edit weekly schedule",
  scheduleHint:
    "Automatic scanner routing follows these times. A manual scanner destination stays selected until you clear it on Scanner.",
  effects: "Sound effects",
  effectsHint: "Check-ins, scan errors, wheel, and groups.",
  data: "Student data",
  dataNote: "These actions affect your whole classroom.",
  activeStudents: {
    one: "1 active student. Keep attendance history and class setup.",
    other: "{count} active students. Keep attendance history and class setup.",
  },
  archiveStudents: "Archive current students…",
  cardAssignments: {
    one: "1 card assignment. Students and history stay.",
    other: "{count} card assignments. Students and history stay.",
  },
  clearCards: "Clear student RFID cards…",
  allData:
    "{students} students and {records} attendance records. Permanent removal.",
  deleteAll: "Delete all student data…",
  archiveTitle: "Archive current students",
  archivePhrase: "ARCHIVE STUDENTS",
  archiveBody:
    "Makes every current student inactive and removes their RFID cards. Attendance history and class schedule remain. You can reactivate students later.",
  clearTitle: "Clear student RFID cards",
  clearPhrase: "CLEAR RFID CARDS",
  clearBody:
    "Removes all card assignments. Students and attendance history stay in place. Cards must be assigned again before scanning works.",
  deleteTitle: "Delete all student data",
  deletePhrase: "DELETE ALL STUDENT DATA",
  deleteBody:
    "Permanently removes every student, class membership, RFID card, attendance record, and attendance session. Teacher account, classes, scanner devices, and preferences remain. This cannot be undone.",
  currentData:
    "Current data: {students} students · {cards} cards · {records} attendance records",
  understand: "I understand what this action will change.",
  typeToConfirm: "Type <b>{phrase}</b> to confirm",
  cancel: "Cancel",
  archivedDone: "Students archived and cards cleared.",
  clearedDone: "Student cards cleared.",
  deletedDone: "Student data permanently deleted.",
  working: "Working…",
  deleteConfirm: "Delete all student data permanently",
  archiveConfirm: "Archive all students",
  clearConfirm: "Clear all student RFID cards",
} satisfies Namespace;
