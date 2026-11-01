import { z } from "zod";
import type { Same } from "./same-type";
import type { AttendanceOperation } from "@/lib/attendance-operations";

const id = z.string().uuid();
export const attendanceOperationSchema = z
  .object({
    operation_id: id,
    period_id: id,
    student_id: id,
    tag_id: id.optional(),
    device_id: id.optional(),
    date: z.iso.date(),
    at: z.iso.datetime({ offset: true }),
    status: z.enum(["present", "absent", "late", "excused"]),
    action: z.enum(["manual", "scan", "note"]),
    note: z.string().max(200).optional(),
    expected: z
      .object({
        id,
        status: z.enum(["present", "absent", "late", "excused"]),
        source: z.enum(["manual", "rfid", "qr"]),
        checked_in_at: z.iso.datetime({ offset: true }).nullable(),
      })
      .nullable(),
    restore: z
      .object({
        status: z.enum(["present", "absent", "late", "excused"]),
        source: z.enum(["manual", "rfid", "qr"]),
        checked_in_at: z.iso.datetime({ offset: true }).nullable(),
      })
      .optional(),
  })
  .refine(
    (op) =>
      op.action !== "scan" ||
      (op.status === "present" && !!op.tag_id && !!op.device_id),
    {
      message: "A scanner tap needs an active device, tag, and present status.",
    },
  )
  .refine((op) => (op.action === "note") === (op.note !== undefined), {
    message: "Only a note change carries a note.",
  })
  .refine(
    (op) =>
      !op.restore ||
      (op.action === "manual" &&
        op.restore.status === op.status &&
        (op.status === "present" || op.status === "late") ===
          Boolean(op.restore.checked_in_at)),
    {
      message: "Restored attendance needs a matching status and check-in time.",
    },
  );

// Fails to compile if the schema and the client-side type drift apart.
true satisfies Same<
  z.infer<typeof attendanceOperationSchema>,
  AttendanceOperation
>;
