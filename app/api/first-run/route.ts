import {
  teacherStore,
  sameOrigin,
  apiError,
  HttpError,
} from "@/lib/server/auth";
import { admin } from "@/lib/server/supabase";
import { firstRunError } from "@/lib/first-run";
import { firstRunSchema } from "@/lib/server/first-run";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const store = await teacherStore();
    const input = firstRunSchema.parse(await request.json());
    const issue = firstRunError(input);
    if (issue) throw new HttpError(400, issue);
    const { data, error } = await admin().rpc("complete_first_run", {
      p_teacher: store.teacherId,
      p_timezone: input.timezone,
      p_name: input.className.trim(),
      p_number: input.periodNumber,
      p_start: input.startTime,
      p_end: input.endTime,
      p_weekdays: input.weekdays,
    });
    if (error) {
      if (error.code === "PGRST202")
        throw new HttpError(
          503,
          "First-run setup needs migration 009 in Supabase.",
        );
      throw error;
    }
    return Response.json({ success: true, classId: data });
  } catch (error) {
    return apiError(error);
  }
}
