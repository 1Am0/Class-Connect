import type { Attendance } from "@/types";
import type { AttendanceOperation } from "./attendance-operations";

export interface StoredAttendanceOperation extends AttendanceOperation {
  teacher_id: string;
  queued_order: number;
  state: "pending" | "conflict";
  error?: string;
}
export interface AttendanceStorage {
  list(teacherId: string): Promise<StoredAttendanceOperation[]>;
  put(operation: StoredAttendanceOperation): Promise<void>;
  remove(operationId: string): Promise<void>;
}
export interface AttendanceAck {
  operation_id: string;
  record: Attendance;
}

export class AttendanceOutbox {
  items: StoredAttendanceOperation[] = [];
  private flushing = false;
  private flushAgain = false;
  private lastOrder = 0;
  private stopped = false;
  constructor(
    private teacherId: string,
    private storage: AttendanceStorage,
    private send: (
      operation: StoredAttendanceOperation,
    ) => Promise<AttendanceAck>,
    private changed: (items: StoredAttendanceOperation[]) => void = () => {},
    private confirmed: (
      operation: StoredAttendanceOperation,
      record: Attendance,
    ) => void = () => {},
  ) {}
  private emit() {
    this.changed([...this.items]);
  }
  stop() {
    this.stopped = true;
  }
  async load() {
    this.items = (await this.storage.list(this.teacherId)).sort(
      (a, b) => a.queued_order - b.queued_order,
    );
    // Changes held back by an older server rule get another try: the
    // browser's change now wins (migration 015).
    for (const item of this.items.filter((row) => row.state === "conflict")) {
      item.state = "pending";
      delete item.error;
      await this.storage.put(item);
    }
    this.lastOrder = this.items.reduce(
      (latest, item) => Math.max(latest, item.queued_order),
      0,
    );
    this.emit();
  }
  async enqueue(operation: AttendanceOperation) {
    if (
      this.items.some(
        (item) =>
          item.student_id === operation.student_id && item.state === "conflict",
      )
    )
      throw new Error(
        "Resolve this student's sync conflict before changing attendance again.",
      );
    const row: StoredAttendanceOperation = {
      ...operation,
      teacher_id: this.teacherId,
      queued_order: (this.lastOrder = Math.max(
        Date.now() * 1000,
        this.lastOrder + 1,
      )),
      state: "pending",
    };
    await this.storage.put(row);
    this.items.push(row);
    this.emit();
  }
  async flush() {
    if (this.stopped) return;
    if (this.flushing) {
      this.flushAgain = true;
      return;
    }
    this.flushing = true;
    const blocked = new Set<string>();
    try {
      for (const row of [...this.items]) {
        if (this.stopped) break;
        if (row.state === "conflict" || blocked.has(row.student_id)) {
          blocked.add(row.student_id);
          continue;
        }
        try {
          const response = await this.send(row);
          if (this.stopped) break;
          if (response.operation_id !== row.operation_id)
            throw new Error(
              "Attendance confirmation did not match the queued change.",
            );
          this.confirmed(row, response.record);
          await this.storage.remove(row.operation_id);
          this.items = this.items.filter(
            (item) => item.operation_id !== row.operation_id,
          );
          for (const later of this.items.filter(
            (item) =>
              item.student_id === row.student_id && item.state === "pending",
          )) {
            later.expected = {
              id: response.record.id,
              status: response.record.status,
              source: response.record.source,
              checked_in_at: response.record.checked_in_at,
            };
            await this.storage.put(later);
          }
          this.emit();
        } catch (cause) {
          const status =
            cause && typeof cause === "object" && "status" in cause
              ? Number(cause.status)
              : 0;
          if (status === 400 || status === 403 || status === 409) {
            row.state = "conflict";
            row.error =
              cause instanceof Error
                ? cause.message
                : "Attendance changed elsewhere. Review the latest status.";
            await this.storage.put(row);
            for (const later of this.items.filter(
              (item) =>
                item.student_id === row.student_id &&
                item.operation_id !== row.operation_id &&
                item.state === "pending",
            )) {
              later.state = "conflict";
              later.error =
                "An earlier change conflicted with attendance saved elsewhere.";
              await this.storage.put(later);
            }
            blocked.add(row.student_id);
            this.emit();
          } else {
            row.error =
              status === 401
                ? "Sign in again to sync attendance saved in this browser."
                : cause instanceof Error &&
                    cause.message.startsWith(
                      "Attendance sync needs migration 010",
                    )
                  ? cause.message
                  : "Could not reach attendance. Check the connection; this browser will retry automatically.";
            await this.storage.put(row);
            this.emit();
            break;
          }
        }
      }
    } finally {
      this.flushing = false;
      if (this.flushAgain && !this.stopped) {
        this.flushAgain = false;
        setTimeout(() => void this.flush(), 0);
      }
    }
  }
  async discardStudent(studentId: string) {
    for (const row of this.items.filter(
      (item) => item.student_id === studentId && item.state === "conflict",
    )) {
      await this.storage.remove(row.operation_id);
      this.items = this.items.filter(
        (item) => item.operation_id !== row.operation_id,
      );
    }
    this.emit();
  }
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("class-connect-attendance", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const operations = db.createObjectStore("operations", {
        keyPath: "operation_id",
      });
      operations.createIndex("teacher_id", "teacher_id");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transact<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, done: (value: T) => void) => void,
): Promise<T> {
  const db = await database();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction("operations", mode);
    let result: T;
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? Error("Attendance storage was interrupted."));
    };
    operation(tx.objectStore("operations"), (value) => {
      result = value;
    });
  });
}
export const indexedDbAttendanceStorage: AttendanceStorage = {
  list: (teacherId) =>
    transact("readonly", (store, done) => {
      const request = store.index("teacher_id").getAll(teacherId);
      request.onsuccess = () =>
        done(request.result as StoredAttendanceOperation[]);
    }),
  put: (row) =>
    transact<void>("readwrite", (store) => {
      store.put(row);
    }),
  remove: (operationId) =>
    transact<void>("readwrite", (store) => {
      store.delete(operationId);
    }),
};
