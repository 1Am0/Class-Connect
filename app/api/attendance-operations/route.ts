import {
  teacherStore,
  sameOrigin,
  apiError,
  HttpError,
} from "@/lib/server/auth";
import { admin } from "@/lib/server/supabase";
import { isDemo } from "@/lib/server/config";
import { attendanceOperationSchema } from "@/lib/server/attendance-operations";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const store = await teacherStore();
    const op = attendanceOperationSchema.parse(await request.json());
    if (isDemo()) {
      if (op.action === "scan") {
        const snapshot = await store.snapshot();
        const tag = snapshot.rfid_tags.find(
          (item) =>
            item.id === op.tag_id &&
            item.student_id === op.student_id &&
            item.active,
        );
        const device = snapshot.devices.find(
          (item) => item.id === op.device_id && item.active,
        );
        if (!tag || !device)
          throw new HttpError(409, "Scanner or tag is no longer active.");
        const result = await store.attendance(
          op.student_id,
          op.period_id,
          op.date,
          "present",
          "rfid",
          op.at,
          tag.uid,
        );
        return Response.json({
          success: true,
          operation_id: op.operation_id,
          record: result.record,
        });
      }
      if (op.action === "note")
        return Response.json({
          success: true,
          operation_id: op.operation_id,
          ...(await store.attendanceNote(
            op.student_id,
            op.period_id,
            op.date,
            op.note ?? "",
          )),
        });
      const result = await store.editAttendance(
        op.student_id,
        op.period_id,
        op.date,
        op.status,
        op.restore,
      );
      return Response.json({
        success: true,
        operation_id: op.operation_id,
        record: result.record,
      });
    }
    const { data, error } = await admin().rpc("apply_attendance_operation", {
      p_teacher: store.teacherId,
      p_op: op,
    });
    if (error) {
      if (error.code === "PGRST202")
        throw new HttpError(
          503,
          "Attendance sync needs migration 010 in Supabase.",
        );
      if (
        op.action === "note" &&
        error.message.startsWith("Invalid attendance operation")
      )
        throw new HttpError(
          409,
          "Attendance notes need database migration 016 in Supabase.",
        );
      if (error.message.startsWith("Attendance changed elsewhere"))
        throw new HttpError(
          409,
          "Attendance changed elsewhere. Review the latest status before retrying.",
        );
      throw error;
    }
    return Response.json({ success: true, ...data });
  } catch (error) {
    return apiError(error);
  }
}
