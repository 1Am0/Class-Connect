import type { Snapshot, Status } from "@/types";

export type HistoryCounts = Record<Status, number> & {
  records: number;
  sessions: number;
};

function emptyCounts(): HistoryCounts {
  return {
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    records: 0,
    sessions: 0,
  };
}

export function historySummary(
  snapshot: Pick<Snapshot, "attendance_sessions" | "attendance_records">,
  periodId: string,
  firstDate: string,
  lastDate: string,
) {
  const days: Record<string, HistoryCounts> = {};
  const sessionDates = new Map<string, string>();
  const total = emptyCounts();

  for (const session of snapshot.attendance_sessions) {
    if (
      session.period_id !== periodId ||
      session.date < firstDate ||
      session.date > lastDate
    )
      continue;
    sessionDates.set(session.id, session.date);
    const day = (days[session.date] ??= emptyCounts());
    day.sessions++;
    total.sessions++;
  }

  for (const record of snapshot.attendance_records) {
    const date = sessionDates.get(record.attendance_session_id);
    if (!date) continue;
    const day = days[date];
    day[record.status]++;
    day.records++;
    total[record.status]++;
    total.records++;
  }

  return { days, total };
}

export function attendanceRate(counts: HistoryCounts) {
  return counts.records
    ? Math.round(((counts.present + counts.late) / counts.records) * 100)
    : null;
}

export function statusRate(counts: HistoryCounts, status: Status) {
  return counts.records
    ? Math.round((counts[status] / counts.records) * 100)
    : null;
}
