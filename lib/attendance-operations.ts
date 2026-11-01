// Client-safe shape of a queued attendance change. The API validates it with
// attendanceOperationSchema in lib/server/attendance-operations.ts.
type AttendanceStatus = "present" | "absent" | "late" | "excused";
type AttendanceSource = "manual" | "rfid" | "qr";

export interface AttendanceOperation {
  operation_id: string;
  period_id: string;
  student_id: string;
  tag_id?: string;
  device_id?: string;
  date: string;
  at: string;
  status: AttendanceStatus;
  /** "note" changes only the note; status is the student's current one. */
  action: "manual" | "scan" | "note";
  note?: string;
  expected: {
    id: string;
    status: AttendanceStatus;
    source: AttendanceSource;
    checked_in_at: string | null;
  } | null;
  restore?: {
    status: AttendanceStatus;
    source: AttendanceSource;
    checked_in_at: string | null;
  };
}
