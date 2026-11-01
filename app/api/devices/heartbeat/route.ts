import { z } from "zod";
import { authenticateDevice, apiError } from "@/lib/server/auth";
export async function POST(req: Request) {
  try {
    const b = z
      .object({
        deviceId: z.string().max(100),
        apiKey: z.string().min(1).max(256),
      })
      .parse(await req.json());
    const { store, device } = await authenticateDevice(b.deviceId, b.apiKey);
    await store.touch(device.id, new Date().toISOString());
    return Response.json({ success: true, status: "heartbeat_received" });
  } catch (e) {
    return apiError(e);
  }
}
