import test from "node:test";
import assert from "node:assert/strict";
import {
  AttendanceOutbox,
  type StoredAttendanceOperation,
  type AttendanceStorage,
} from "../lib/attendance-outbox";

const teacher = "11111111-1111-4111-8111-111111111111";
const base = {
  operation_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  period_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  student_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  date: "2026-10-22",
  at: "2026-10-22T15:00:00Z",
  status: "present" as const,
  action: "manual" as const,
  expected: null,
};
class MemoryStorage implements AttendanceStorage {
  rows = new Map<string, StoredAttendanceOperation>();
  async list(owner: string) {
    return [...this.rows.values()]
      .filter((row) => row.teacher_id === owner)
      .sort((a, b) => a.operation_id.localeCompare(b.operation_id));
  }
  async put(row: StoredAttendanceOperation) {
    this.rows.set(row.operation_id, structuredClone(row));
  }
  async remove(id: string) {
    this.rows.delete(id);
  }
}
test("outbox survives reload and never replays another teacher's changes", async () => {
  const storage = new MemoryStorage();
  const queue = new AttendanceOutbox(teacher, storage, async () => {
    throw Error("offline");
  });
  await queue.load();
  await queue.enqueue(base);
  const reopened = new AttendanceOutbox(teacher, storage, async () => {
    throw Error("offline");
  });
  await reopened.load();
  assert.equal(reopened.items.length, 1);
  const other = new AttendanceOutbox(
    "22222222-2222-4222-8222-222222222222",
    storage,
    async () => {
      throw Error("offline");
    },
  );
  await other.load();
  assert.equal(other.items.length, 0);
});
test("reloaded rapid edits keep insertion order even when their IDs sort backwards", async () => {
  const storage = new MemoryStorage();
  const queue = new AttendanceOutbox(teacher, storage, async () => {
    throw Error("offline");
  });
  await queue.load();
  await queue.enqueue({
    ...base,
    operation_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
  });
  await queue.enqueue({
    ...base,
    operation_id: "00000000-0000-4000-8000-000000000000",
    status: "absent",
  });
  const reopened = new AttendanceOutbox(teacher, storage, async () => {
    throw Error("offline");
  });
  await reopened.load();
  assert.deepEqual(
    reopened.items.map((item) => item.status),
    ["present", "absent"],
  );
});
test("outbox chains rapid changes using the prior confirmed record", async () => {
  const storage = new MemoryStorage();
  const requests: StoredAttendanceOperation[] = [];
  const queue = new AttendanceOutbox(teacher, storage, async (op) => {
    requests.push(structuredClone(op));
    return {
      operation_id: op.operation_id,
      record: {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        student_id: op.student_id,
        attendance_session_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        teacher_id: teacher,
        status: op.status,
        source: "manual",
        checked_in_at: op.status === "present" ? op.at : null,
      },
    };
  });
  await queue.load();
  await queue.enqueue(base);
  await queue.enqueue({
    ...base,
    operation_id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    status: "absent",
  });
  await queue.flush();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].expected?.status, "present");
  assert.equal(queue.items.length, 0);
});
test("a storage failure leaves no acknowledged local operation", async () => {
  const storage = new MemoryStorage();
  storage.put = async () => {
    throw Error("disk unavailable");
  };
  let sends = 0;
  const queue = new AttendanceOutbox(teacher, storage, async () => {
    sends++;
    throw Error("unexpected");
  });
  await queue.load();
  await assert.rejects(queue.enqueue(base));
  await queue.flush();
  assert.equal(queue.items.length, 0);
  assert.equal(sends, 0);
});
test("a conflict stays until discarded, and retries after a reload", async () => {
  const storage = new MemoryStorage();
  const queue = new AttendanceOutbox(teacher, storage, async () => {
    const error = new Error("Attendance changed elsewhere") as Error & {
      status: number;
    };
    error.status = 409;
    throw error;
  });
  await queue.load();
  await queue.enqueue(base);
  await queue.flush();
  assert.equal(queue.items[0].state, "conflict");
  await assert.rejects(queue.enqueue(base), /Resolve this student/);
  const reopened = new AttendanceOutbox(teacher, storage, async (op) => ({
    operation_id: op.operation_id,
    record: {
      id: "record-1",
      teacher_id: teacher,
      attendance_session_id: "session-1",
      student_id: op.student_id,
      status: op.status,
      source: "manual",
      checked_in_at: null,
    },
  }));
  await reopened.load();
  assert.equal(reopened.items[0].state, "pending");
  await reopened.flush();
  assert.equal(reopened.items.length, 0);
  assert.equal((await storage.list(teacher)).length, 0);
  await queue.discardStudent(base.student_id);
  assert.equal(queue.items.length, 0);
});
test("a failed sync keeps the scan queued and explains why it has not reached Supabase", async () => {
  const storage = new MemoryStorage();
  let available = false;
  const queue = new AttendanceOutbox(teacher, storage, async (op) => {
    if (!available) {
      const error = new Error(
        "Attendance sync needs migration 010 in Supabase.",
      ) as Error & {
        status: number;
      };
      error.status = 503;
      throw error;
    }
    return {
      operation_id: op.operation_id,
      record: {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        student_id: op.student_id,
        attendance_session_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        teacher_id: teacher,
        status: op.status,
        source: "rfid",
        checked_in_at: op.at,
      },
    };
  });
  await queue.load();
  await queue.enqueue({
    ...base,
    action: "scan",
    tag_id: base.student_id,
    device_id: base.period_id,
  });
  await queue.flush();
  assert.equal(queue.items[0].state, "pending");
  assert.match(queue.items[0].error ?? "", /migration 010/);
  const reopened = new AttendanceOutbox(teacher, storage, async () => {
    throw Error("offline");
  });
  await reopened.load();
  assert.match(reopened.items[0].error ?? "", /migration 010/);
  available = true;
  await queue.flush();
  assert.equal(queue.items.length, 0);
});
test("an invalid queued student does not block another student's sync", async () => {
  const storage = new MemoryStorage();
  const saved: string[] = [];
  const queue = new AttendanceOutbox(teacher, storage, async (op) => {
    if (op.student_id === base.student_id) {
      const error = new Error("Student left this class") as Error & {
        status: number;
      };
      error.status = 400;
      throw error;
    }
    saved.push(op.student_id);
    return {
      operation_id: op.operation_id,
      record: {
        id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        student_id: op.student_id,
        attendance_session_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        teacher_id: teacher,
        status: op.status,
        source: "manual",
        checked_in_at: op.at,
      },
    };
  });
  await queue.load();
  await queue.enqueue(base);
  await queue.enqueue({
    ...base,
    operation_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    student_id: "11111111-1111-4111-8111-111111111111",
  });
  await queue.flush();
  assert.equal(queue.items.length, 1);
  assert.equal(queue.items[0].state, "conflict");
  assert.equal(saved.length, 1);
});
