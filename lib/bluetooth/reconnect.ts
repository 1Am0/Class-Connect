// Wait before each automatic reconnect attempt: quick at first, then every
// 30 seconds for as long as the page stays open.
const delays = [0, 1_000, 2_000, 4_000, 8_000, 15_000, 30_000];
export const reconnectDelay = (attempt: number) =>
  delays[Math.min(Math.max(0, attempt), delays.length - 1)];

/** The scanner this browser last connected to, to reconnect without a picker. */
export interface RememberedScanner {
  /** The browser's id for the Bluetooth device. */
  bluetoothId: string;
  /** The classroom's id for the scanner. */
  deviceId: string;
}
const key = "class-connect-scanner";
export function readRememberedScanner(
  storage: Pick<Storage, "getItem">,
): RememberedScanner | null {
  try {
    const value = JSON.parse(storage.getItem(key) ?? "null");
    return value &&
      typeof value.bluetoothId === "string" &&
      typeof value.deviceId === "string" &&
      value.bluetoothId &&
      value.deviceId
      ? { bluetoothId: value.bluetoothId, deviceId: value.deviceId }
      : null;
  } catch {
    return null;
  }
}
export function rememberScanner(
  storage: Pick<Storage, "setItem" | "removeItem">,
  scanner: RememberedScanner | null,
) {
  try {
    if (scanner) storage.setItem(key, JSON.stringify(scanner));
    else storage.removeItem(key);
  } catch {
    /* The scanner just won't reconnect by itself next visit. */
  }
}

/** "just now", "2 min ago", "1 hr ago" for the last scan. */
export function sinceLabel(then: number, now: number) {
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)} hr ago`;
}
