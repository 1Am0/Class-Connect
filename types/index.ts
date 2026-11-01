export type Status = "present" | "absent" | "late" | "excused";
export interface BellPeriod {
  period_number: number;
  start_time: string;
  end_time: string;
}
export type SchoolWeekday =
  "monday" | "tuesday" | "wednesday" | "thursday" | "friday";
export interface SchedulePreset {
  id: string;
  name: string;
  periods: BellPeriod[];
}
export interface Teacher {
  id: string;
  onboarding_completed?: boolean;
  name: string;
  email: string;
  timezone: string;
  override_period_id: string | null;
  bell_schedule?: BellPeriod[];
  schedule_presets?: SchedulePreset[];
  weekday_schedule?: Partial<Record<SchoolWeekday, string>>;
  weekly_schedule_version?: number;
  home_class_preferences?: {
    order: string[];
  };
  /** Present once migration 014 is applied. */
  class_banners?: Record<
    string,
    { theme?: string; color?: string; photo?: string }
  >;
}
export interface Period {
  id: string;
  teacher_id: string;
  name: string;
  period_number: number;
  start_time: string;
  end_time: string;
  active: boolean;
  time_source?: "school" | "custom";
}
export interface Student {
  id: string;
  teacher_id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  optional_notes: string;
  active: boolean;
  school_student_id?: string | null;
  school_email?: string | null;
}
export interface Membership {
  id: string;
  teacher_id: string;
  period_id: string;
  student_id: string;
}
export interface Tag {
  id: string;
  teacher_id: string;
  student_id: string;
  uid: string;
  active: boolean;
  assigned_at: string;
}
export interface Session {
  id: string;
  teacher_id: string;
  period_id: string;
  date: string;
  started_at: string;
  ended_at: string | null;
  status: string;
}
export interface Attendance {
  id: string;
  teacher_id: string;
  attendance_session_id: string;
  student_id: string;
  status: Status;
  checked_in_at: string | null;
  source: "manual" | "rfid" | "qr";
  /** Optional reason, once migration 016 is applied. */
  note?: string | null;
}
export interface Device {
  id: string;
  teacher_id: string;
  device_name: string;
  device_identifier: string;
  active: boolean;
  last_seen_at: string | null;
  enrollment_until: string | null;
  pending_uid: string | null;
}
export type ActivitySetKind = "vocabulary" | "conversation" | "scramble";
export interface ActivitySetItem {
  id: string;
  text: string;
  supporting_text: string;
  sentence_starter?: string;
  follow_up_question?: string;
  grammar_explanation?: string;
  accepted_answers?: string[];
}
export interface ActivitySet {
  id: string;
  teacher_id: string;
  name: string;
  kind: ActivitySetKind;
  items: ActivitySetItem[];
  created_at: string;
  updated_at: string;
}
export interface Snapshot {
  teacher: Teacher;
  periods: Period[];
  students: Student[];
  period_students: Membership[];
  rfid_tags: Tag[];
  attendance_sessions: Session[];
  attendance_records: Attendance[];
  devices: Device[];
  activity_sets: ActivitySet[];
  demo: boolean;
  simulator: boolean;
}
export type Tables = {
  periods: Period;
  students: Student;
  period_students: Membership;
  rfid_tags: Tag;
  attendance_sessions: Session;
  attendance_records: Attendance;
  devices: Device;
  activity_sets: ActivitySet;
};
