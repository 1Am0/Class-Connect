import type { Attendance, Snapshot } from "@/types";
import type { StoredAttendanceOperation } from "./attendance-outbox";

export function overlayPendingAttendance(
  snapshot: Snapshot,
  operations: readonly StoredAttendanceOperation[],
): Snapshot {
  const sessions = [...snapshot.attendance_sessions];
  const records = [...snapshot.attendance_records];
  for (const operation of operations) {
    if (operation.state !== "pending") continue;
    let session = sessions.find(
      (item) =>
        item.period_id === operation.period_id && item.date === operation.date,
    );
    if (!session) {
      session = {
        id: `pending:${operation.period_id}:${operation.date}`,
        teacher_id: operation.teacher_id,
        period_id: operation.period_id,
        date: operation.date,
        started_at: operation.at,
        ended_at: null,
        status: "open",
      };
      sessions.push(session);
    }
    const index = records.findIndex(
      (item) =>
        item.attendance_session_id === session.id &&
        item.student_id === operation.student_id,
    );
    const previous = records[index];
    if (operation.action === "note") {
      const note = operation.note?.trim() || null;
      const noted: Attendance = previous
        ? { ...previous, note }
        : {
            id: operation.expected?.id ?? `pending:${operation.operation_id}`,
            teacher_id: operation.teacher_id,
            attendance_session_id: session.id,
            student_id: operation.student_id,
            status: "absent",
            source: "manual",
            checked_in_at: null,
            note,
          };
      if (index >= 0) records[index] = noted;
      else records.push(noted);
      continue;
    }
    const record: Attendance = {
      ...(previous?.note && { note: previous.note }),
      id:
        previous?.id ??
        operation.expected?.id ??
        `pending:${operation.operation_id}`,
      teacher_id: operation.teacher_id,
      attendance_session_id: session.id,
      student_id: operation.student_id,
      status: operation.status,
      source:
        operation.restore?.source ??
        (operation.action === "scan" ? "rfid" : "manual"),
      checked_in_at: operation.restore
        ? operation.restore.checked_in_at
        : operation.status === "present" || operation.status === "late"
          ? operation.at
          : null,
    };
    if (index >= 0) records[index] = record;
    else records.push(record);
  }
  return {
    ...snapshot,
    attendance_sessions: sessions,
    attendance_records: records,
  };
}
