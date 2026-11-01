"use client";
import { createContext, useContext } from "react";
import type { Snapshot } from "@/types";
import type { AttendanceOperation } from "@/lib/attendance-operations";
import type { StoredAttendanceOperation } from "@/lib/attendance-outbox";
export interface ClassroomContext {
  s: Snapshot;
  periodId: string;
  date: string;
  notify: (text: string, tone?: ToastTone) => void;
  mutate: (body: object) => Promise<Record<string, unknown>>;
  refresh: () => Promise<void>;
  syncError: boolean;
  syncing: boolean;
  pendingAttendance: StoredAttendanceOperation[];
  enqueueAttendance: (operation: AttendanceOperation) => Promise<void>;
  attendanceStorageError: string;
  discardAttendanceConflict: (studentId: string) => Promise<void>;
}
export type ToastTone = "info" | "error";
export const Context = createContext<ClassroomContext>(null!);
export const useClassroom = () => useContext(Context);
export async function copyText(
  text: string,
  notify: (s: string, tone?: ToastTone) => void,
) {
  try {
    await navigator.clipboard.writeText(text);
    notify("Copied to clipboard.");
  } catch {
    notify(
      "Clipboard unavailable. Please use a secure browser connection.",
      "error",
    );
  }
}
