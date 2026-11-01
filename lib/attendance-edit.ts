import type { Attendance, Status } from "@/types";

export type AttendanceVersion = Pick<
  Attendance,
  "id" | "status" | "source" | "checked_in_at"
>;
export const attendanceConflict =
  "Attendance changed elsewhere. Refresh the list and review the latest status before trying again.";

export function sameAttendance(
  current: AttendanceVersion,
  expected: AttendanceVersion,
) {
  return (
    current.id === expected.id &&
    current.status === expected.status &&
    current.source === expected.source &&
    (current.checked_in_at === expected.checked_in_at ||
      (current.checked_in_at !== null &&
        expected.checked_in_at !== null &&
        Date.parse(current.checked_in_at) ===
          Date.parse(expected.checked_in_at)))
  );
}

export function attendancePatch(
  status: Status,
  at: string,
  restore?: Omit<AttendanceVersion, "id">,
) {
  return (
    restore ?? {
      status,
      source: "manual" as const,
      checked_in_at: status === "present" || status === "late" ? at : null,
    }
  );
}
