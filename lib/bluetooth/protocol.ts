// Keep UUIDs and byte layouts in sync with ClassroomBluetooth.ino.
// Every packet fits the default BLE notification payload (20 bytes).
export const BLE_SERVICE = "4f6f1000-1e0d-4f56-a310-83b8428d0010";
export const BLE_EVENTS = "4f6f1001-1e0d-4f56-a310-83b8428d0010";
export const BLE_ACK = "4f6f1002-1e0d-4f56-a310-83b8428d0010";
export type ScannerPacket =
  { type: "heartbeat" } | { type: "scan"; sequence: number; uid: string };
export function decodePacket(value: DataView): ScannerPacket {
  if (value.byteLength < 2 || value.getUint8(0) !== 1)
    throw new Error(
      "Unsupported scanner firmware. Upload ClassroomBluetooth first.",
    );
  if (value.getUint8(1) === 2 && value.byteLength === 2)
    return { type: "heartbeat" };
  if (value.getUint8(1) !== 1 || value.byteLength < 7)
    throw new Error("Invalid Bluetooth scan packet.");
  const size = value.getUint8(6);
  if (![4, 7, 10].includes(size) || value.byteLength !== 7 + size)
    throw new Error("Invalid Bluetooth UID length.");
  const uid = Array.from({ length: size }, (_, i) =>
    value
      .getUint8(i + 7)
      .toString(16)
      .padStart(2, "0"),
  )
    .join("")
    .toUpperCase();
  return { type: "scan", sequence: value.getUint32(2, true), uid };
}
export const ACK_CODES: Record<string, number> = {
  checked_in: 0,
  already_checked_in: 1,
  enrollment_detected: 2,
  queued_locally: 3,
  unknown_tag: 10,
  wrong_period: 11,
  no_active_period: 12,
  temporarily_unavailable: 13,
  invalid_request: 14,
  unauthorized_device: 15,
};
export function encodeAck(
  sequence: number,
  status: string,
): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(7);
  bytes[0] = 1;
  bytes[1] = 3;
  new DataView(bytes.buffer).setUint32(2, sequence, true);
  bytes[6] = ACK_CODES[status] ?? 13;
  return bytes;
}
export function scanMessage(status: string, student?: string): string {
  const messages: Record<string, string> = {
    checked_in: `${student ?? "Student"} checked in.`,
    already_checked_in: `${student ?? "Student"} is already checked in.`,
    enrollment_detected: "Tag detected. Confirm the student’s tag in Students.",
    queued_locally: `${student ?? "Student"} present · pending sync.`,
    unknown_tag: "Unknown tag. Assign it to a student first.",
    wrong_period: "Student is not enrolled in the scanner’s active class.",
    no_active_period:
      "Choose a class under Taking attendance for on Today, then tap again.",
    unauthorized_device:
      "This scanner is disabled or is not part of your classroom.",
    invalid_request: "Invalid scan. Check the scanner firmware and tap again.",
    temporarily_unavailable:
      "Scan not confirmed. Check the laptop’s connection, then tap again.",
  };
  return (
    messages[status] ??
    "Scan not confirmed. Sign in again or check your connection."
  );
}
