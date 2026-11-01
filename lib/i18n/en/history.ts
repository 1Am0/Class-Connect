import type { Namespace } from "../translate";

// The History calendar and day summary.
export default {
  controls: "Attendance history controls and statistics",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  monthly: "Monthly attendance",
  outsideMonth: "Outside month",
  allAbsent: "All absent · {count} recorded",
  attended: "{rate}% attended · {count} recorded",
  noStatuses: "No statuses saved",
  weekend: "Weekend",
  upcoming: "Upcoming",
  noRecords: "No records",
  dayLabel: "{date}: {detail}. View attendance summary",
  calendarHint:
    "Darker days had higher attendance. Choose a day to see its summary; use arrow keys to move through days.",
  summary: "Attendance summary",
  rate: "Attendance rate",
  rateDetail: "{here} of {records} saved records marked present or late",
  statusCounts: "Attendance status counts",
  noDay: "No attendance saved for this day.",
  noDayBody: "Students without a saved status are not counted as absent.",
} satisfies Namespace;
