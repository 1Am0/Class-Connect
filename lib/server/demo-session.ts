import { randomUUID } from "node:crypto";
import type { Snapshot } from "@/types";
export function ensureDemoSession(
  s: Snapshot,
  periodId: string,
  date: string,
  at: string,
) {
  let session = s.attendance_sessions.find(
    (x) => x.period_id === periodId && x.date === date,
  );
  if (!session) {
    session = {
      id: randomUUID(),
      teacher_id: s.teacher.id,
      period_id: periodId,
      date,
      started_at: at,
      ended_at: null,
      status: "open",
    };
    s.attendance_sessions.push(session);
    const members = s.period_students.filter(
      (m) =>
        m.period_id === periodId &&
        s.students.some((st) => st.id === m.student_id && st.active),
    );
    for (const member of members)
      s.attendance_records.push({
        id: randomUUID(),
        teacher_id: s.teacher.id,
        attendance_session_id: session.id,
        student_id: member.student_id,
        status: "absent",
        source: "manual",
        checked_in_at: null,
      });
  }
  return session;
}
