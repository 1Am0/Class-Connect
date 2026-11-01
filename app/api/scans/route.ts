import { z } from "zod";
import { authenticateDevice, apiError } from "@/lib/server/auth";
import { processScan } from "@/lib/core";
export async function POST(req: Request) {
  try {
    const b = z
      .object({
        deviceId: z.string().max(100),
        apiKey: z.string().min(1).max(256),
        uid: z.string().max(40),
      })
      .parse(await req.json());
    const { store, device } = await authenticateDevice(b.deviceId, b.apiKey);
    const result = await processScan(store, device.id, b.uid);
    return Response.json(result, { status: result.success ? 200 : 422 });
  } catch (e) {
    return apiError(e);
  }
}
