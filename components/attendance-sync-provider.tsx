"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Attendance } from "@/types";
import type { AttendanceOperation } from "@/lib/attendance-operations";
import {
  AttendanceOutbox,
  indexedDbAttendanceStorage,
  type StoredAttendanceOperation,
} from "@/lib/attendance-outbox";

export function useAttendanceSync(
  teacherId: string,
  onConfirmed: (
    operation: StoredAttendanceOperation,
    record: Attendance,
  ) => void,
) {
  const [items, setItems] = useState<StoredAttendanceOperation[]>([]);
  const [storageError, setStorageError] = useState("");
  const queue = useRef<AttendanceOutbox | null>(null);
  const loaded = useRef<Promise<void> | null>(null);
  const confirmed = useRef(onConfirmed);
  confirmed.current = onConfirmed;
  useEffect(() => {
    let active = true;
    const outbox = new AttendanceOutbox(
      teacherId,
      indexedDbAttendanceStorage,
      async (operation) => {
        const response = await fetch("/api/attendance-operations", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(operation),
        });
        const result = await response.json();
        if (!response.ok) {
          const error = new Error(
            result.error || "Attendance is waiting for a connection.",
          ) as Error & { status: number };
          error.status = response.status;
          throw error;
        }
        return result;
      },
      (next) => {
        if (active) {
          setItems(next);
          if (next.some((item) => item.state === "conflict"))
            window.dispatchEvent(new Event("classroom-attendance-updated"));
        }
      },
      (operation, record) => {
        if (active) confirmed.current(operation, record);
      },
    );
    queue.current = outbox;
    loaded.current = outbox
      .load()
      .then(() => {
        void outbox.flush();
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Local attendance storage is unavailable. Changes cannot be queued in this browser.",
          );
      });
    const retry = () => void outbox.flush();
    const timer = setInterval(retry, 5000);
    window.addEventListener("online", retry);
    window.addEventListener("focus", retry);
    return () => {
      active = false;
      outbox.stop();
      queue.current = null;
      loaded.current = null;
      clearInterval(timer);
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", retry);
    };
  }, [teacherId]);
  const enqueue = useCallback(
    async (operation: AttendanceOperation) => {
      if (storageError || !queue.current)
        throw new Error(
          storageError ||
            "Local attendance storage is still opening. Try again.",
        );
      try {
        await loaded.current;
        await queue.current.enqueue(operation);
        setTimeout(() => void queue.current?.flush(), 0);
      } catch (cause) {
        if (
          cause instanceof Error &&
          cause.message.startsWith("Resolve this student's sync conflict")
        )
          throw cause;
        setStorageError(
          "Local attendance storage is unavailable. This change was not queued.",
        );
        throw new Error(
          "Local attendance storage is unavailable. This change was not queued.",
        );
      }
    },
    [storageError],
  );
  return {
    items,
    enqueue,
    storageError,
    retry: () => void queue.current?.flush(),
    discardStudent: async (studentId: string) =>
      queue.current?.discardStudent(studentId),
  };
}
