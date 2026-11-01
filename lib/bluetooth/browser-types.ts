// Minimal Web Bluetooth surface; TypeScript's DOM library does not include it.
export interface BleCharacteristic extends EventTarget {
  value?: DataView;
  startNotifications(): Promise<BleCharacteristic>;
  writeValueWithResponse(value: Uint8Array<ArrayBuffer>): Promise<void>;
}
export interface BleServer {
  connected: boolean;
  connect(): Promise<BleServer>;
  disconnect(): void;
  getPrimaryService(
    uuid: string,
  ): Promise<{ getCharacteristic(uuid: string): Promise<BleCharacteristic> }>;
}
export interface BleDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BleServer;
  /** Fires "advertisementreceived" while the device is in range. Chrome only. */
  watchAdvertisements?(options?: { signal?: AbortSignal }): Promise<void>;
}
export interface BluetoothApi {
  requestDevice(options: {
    filters: { services: string[] }[];
  }): Promise<BleDevice>;
  /** Devices this site was already allowed to use. Chrome and Edge only. */
  getDevices?(): Promise<BleDevice[]>;
}
export function browserBluetooth(): BluetoothApi | undefined {
  return typeof navigator === "undefined"
    ? undefined
    : (navigator as Navigator & { bluetooth?: BluetoothApi }).bluetooth;
}
