import { z } from "zod";
import { apiError, teacherStore } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const deviceId = z
      .string()
      .uuid()
      .parse(new URL(request.url).searchParams.get("deviceId"));
    const pendingUid = await (
      await teacherStore()
    ).pendingEnrollmentUid(deviceId);
    return Response.json(
      { pendingUid },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
