import { z } from "zod";
import {
  teacherStore,
  apiError,
  HttpError,
  sameOrigin,
} from "@/lib/server/auth";
import { simulatorEnabled } from "@/lib/server/config";
import { processScan } from "@/lib/core";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    if (!simulatorEnabled()) throw new HttpError(404, "Simulator unavailable.");
    const store = await teacherStore();
    const b = z
      .object({ deviceId: z.string().uuid(), uid: z.string().max(40) })
      .parse(await req.json());
    const result = await processScan(store, b.deviceId, b.uid);
    return Response.json(result, { status: result.success ? 200 : 422 });
  } catch (e) {
    return apiError(e);
  }
}
