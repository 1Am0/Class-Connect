import type { RelayResponse } from "./relay";

export type LocalScanHandler = (
  deviceId: string,
  uid: string,
) => Promise<RelayResponse | null>;
let handler: LocalScanHandler | null = null;
export function registerLocalScan(next: LocalScanHandler) {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}
export async function tryLocalScan(deviceId: string, uid: string) {
  return handler ? handler(deviceId, uid) : null;
}
