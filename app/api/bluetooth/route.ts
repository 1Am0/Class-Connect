import { teacherStore, sameOrigin, apiError } from "@/lib/server/auth";
import { relayBluetooth, relaySchema } from "@/lib/server/bluetooth";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const store = await teacherStore();
    const body = relaySchema.parse(await request.json());
    const result = await relayBluetooth(store, body);
    return Response.json(result, {
      status: result.success
        ? 200
        : result.status === "unauthorized_device"
          ? 403
          : 422,
    });
  } catch (error) {
    return apiError(error);
  }
}
