import { z } from "zod";
import type { ScanStore } from "../core";
import { processScan } from "../core";
export interface RelayStore extends ScanStore {
  activeDevice(deviceId: string): Promise<boolean>;
}
export const relaySchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("scan"),
      deviceId: z.string().uuid(),
      uid: z.string().min(1).max(40),
    })
    .strict(),
  z
    .object({ action: z.literal("heartbeat"), deviceId: z.string().uuid() })
    .strict(),
]);
// The laptop's verified teacher session authorizes relay requests. Device API
// secrets never enter the browser; processScan still enforces roster ownership.
export async function relayBluetooth(
  store: RelayStore,
  body: z.infer<typeof relaySchema>,
) {
  if (body.action === "scan")
    return processScan(store, body.deviceId, body.uid);
  if (!(await store.activeDevice(body.deviceId)))
    return { success: false, status: "unauthorized_device" };
  await store.touch(body.deviceId, new Date().toISOString());
  return { success: true, status: "heartbeat_received" };
}
