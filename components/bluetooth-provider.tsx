"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  browserBluetooth,
  type BleDevice,
  type BleCharacteristic,
} from "@/lib/bluetooth/browser-types";
import { BLE_SERVICE, BLE_EVENTS, BLE_ACK } from "@/lib/bluetooth/protocol";
import { ScanRelay, type RelayResponse } from "@/lib/bluetooth/relay";
import { tryLocalScan } from "@/lib/bluetooth/local-scan";
import {
  readRememberedScanner,
  reconnectDelay,
  rememberScanner,
} from "@/lib/bluetooth/reconnect";
import { usePreferences } from "./preferences";

type Connection = "idle" | "connecting" | "connected" | "disconnected";
interface BluetoothState {
  supported: boolean | null;
  connection: Connection;
  deviceId: string;
  name: string;
  message: string;
  success: boolean;
  lastUid: string;
  lastReceived: number | null;
  /** When the last tag was tapped, for "last scan 2 min ago". */
  lastScan: number | null;
  /** Trying again by itself after the scanner dropped or on page load. */
  reconnecting: boolean;
}
const initial: BluetoothState = {
  supported: null,
  connection: "idle",
  deviceId: "",
  name: "",
  message: "",
  success: true,
  lastUid: "",
  lastReceived: null,
  lastScan: null,
  reconnecting: false,
};
const BluetoothContext = createContext<{
  state: BluetoothState;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => void;
} | null>(null);
export function useBluetooth() {
  const value = useContext(BluetoothContext);
  if (!value) throw new Error("Bluetooth provider missing.");
  return value;
}

// This provider is in the root layout so client-side page changes do not drop BLE.
export function BluetoothProvider({ children }: { children: React.ReactNode }) {
  const { play } = usePreferences();
  const playRef = useRef(play);
  playRef.current = play;
  const [state, setState] = useState(initial);
  const connection = useRef<{
    device: BleDevice;
    characteristic?: BleCharacteristic;
    onValue?: EventListener;
    onDisconnect: EventListener;
    relay?: ScanRelay;
  } | null>(null);
  const generation = useRef(0);
  const requests = useRef(new Set<AbortController>());
  // The pending automatic reconnect: its timer and advertisement watch.
  const waiting = useRef<{
    timer: ReturnType<typeof setTimeout>;
    watch: AbortController;
    device: BleDevice;
    onAdvertisement: EventListener;
  } | null>(null);
  function release() {
    generation.current++;
    for (const request of requests.current) request.abort();
    requests.current.clear();
    if (waiting.current) {
      clearTimeout(waiting.current.timer);
      waiting.current.watch.abort();
      waiting.current.device.removeEventListener(
        "advertisementreceived",
        waiting.current.onAdvertisement,
      );
      waiting.current = null;
    }
    const current = connection.current;
    connection.current = null;
    current?.relay?.stop();
    if (current?.characteristic && current.onValue)
      current.characteristic.removeEventListener(
        "characteristicvaluechanged",
        current.onValue,
      );
    if (current) {
      current.device.removeEventListener(
        "gattserverdisconnected",
        current.onDisconnect,
      );
      current.device.gatt?.disconnect();
    }
  }
  function disconnect() {
    release();
    // A teacher who turns the scanner off doesn't want it back by itself.
    rememberScanner(localStorage, null);
    setState((s) => ({
      ...s,
      connection: "disconnected",
      reconnecting: false,
      message:
        "Bluetooth disconnected. Reconnect before the next student scans.",
      success: false,
    }));
  }
  /**
   * Reconnect to a scanner this site may already use, with no picker. Tries
   * right away, again when the scanner advertises nearby, and on a backoff.
   */
  function reconnect(device: BleDevice, deviceId: string, attempt = 0) {
    release();
    const epoch = generation.current;
    setState((s) => ({
      ...s,
      connection: s.connection === "connected" ? "disconnected" : s.connection,
      deviceId,
      reconnecting: true,
      ...(attempt > 0 && {
        message:
          "Waiting for the scanner. It reconnects by itself once it is on and nearby.",
        success: false,
      }),
    }));
    const tryNow = () => {
      if (generation.current !== epoch) return;
      if (waiting.current) {
        clearTimeout(waiting.current.timer);
        waiting.current.watch.abort();
        waiting.current.device.removeEventListener(
          "advertisementreceived",
          waiting.current.onAdvertisement,
        );
        waiting.current = null;
      }
      attach(device, deviceId, epoch).catch(() => {
        if (generation.current === epoch)
          reconnect(device, deviceId, attempt + 1);
      });
    };
    const watch = new AbortController();
    const onAdvertisement = () => tryNow();
    waiting.current = {
      timer: setTimeout(tryNow, reconnectDelay(attempt)),
      watch,
      device,
      onAdvertisement,
    };
    if (attempt > 0 && device.watchAdvertisements) {
      device.addEventListener("advertisementreceived", onAdvertisement);
      device.watchAdvertisements({ signal: watch.signal }).catch(() => {
        /* The backoff timer still retries. */
      });
    }
  }
  useEffect(() => {
    const bluetooth = browserBluetooth();
    setState((s) => ({
      ...s,
      supported: window.isSecureContext && !!bluetooth,
    }));
    // Reconnect to last visit's scanner without the browser's picker.
    const remembered = readRememberedScanner(localStorage);
    const epoch = generation.current;
    if (remembered && window.isSecureContext && bluetooth?.getDevices)
      void bluetooth
        .getDevices()
        .then((devices) => {
          const device = devices.find(
            (item) => item.id === remembered.bluetoothId,
          );
          if (device && generation.current === epoch) {
            setState((s) => ({
              ...s,
              message: "Reconnecting to your scanner…",
              success: true,
            }));
            reconnect(device, remembered.deviceId);
          }
        })
        .catch(() => {
          /* The teacher connects with the button instead. */
        });
    return release;
    // reconnect and release only touch refs and state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /** Sets up a chosen scanner's connection; throws when it can't. */
  async function attach(device: BleDevice, deviceId: string, epoch: number) {
    const onDisconnect = () => {
      if (generation.current !== epoch) return;
      playRef.current("error");
      setState((s) => ({
        ...s,
        connection: "disconnected",
        message: "Scanner disconnected. Reconnecting automatically…",
        success: false,
      }));
      reconnect(device, deviceId);
    };
    connection.current = { device, onDisconnect };
    device.addEventListener("gattserverdisconnected", onDisconnect);
    const server = await device.gatt?.connect();
    if (!server)
      throw new Error("This device does not offer a Bluetooth LE connection.");
    if (generation.current !== epoch) {
      server.disconnect();
      return;
    }
    const service = await server.getPrimaryService(BLE_SERVICE);
    const events = await service.getCharacteristic(BLE_EVENTS);
    const ack = await service.getCharacteristic(BLE_ACK);
    if (generation.current !== epoch || !connection.current) return;
    const relay = new ScanRelay(deviceId, {
      post: async (body) => {
        if (
          "action" in body &&
          body.action === "scan" &&
          "uid" in body &&
          typeof body.uid === "string"
        ) {
          const local = await tryLocalScan(deviceId, body.uid);
          if (local) return local;
        }
        const controller = new AbortController();
        requests.current.add(controller);
        const timeout = setTimeout(() => controller.abort(), 4500);
        try {
          const response = await fetch("/api/bluetooth", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          if (response.status === 401)
            return { success: false, status: "sign_in_required" };
          const result = (await response.json()) as RelayResponse;
          if (
            typeof result.success !== "boolean" ||
            typeof result.status !== "string"
          )
            throw new Error("Invalid server response.");
          return result;
        } finally {
          clearTimeout(timeout);
          requests.current.delete(controller);
        }
      },
      acknowledge: (value) => ack.writeValueWithResponse(value),
      received: () => {
        if (generation.current === epoch)
          setState((s) => ({ ...s, lastReceived: Date.now() }));
      },
      report: (message, success, uid) => {
        if (uid && message.endsWith(" checked in.")) playRef.current("success");
        else if (uid && !success) playRef.current("error");
        if (generation.current === epoch)
          setState((s) => ({
            ...s,
            message,
            success,
            lastUid: uid ?? s.lastUid,
            lastScan: uid ? Date.now() : s.lastScan,
          }));
      },
      updated: () =>
        window.dispatchEvent(new Event("classroom-attendance-updated")),
    });
    const onValue: EventListener = (event) => {
      const value = (event.target as BleCharacteristic).value;
      if (value && generation.current === epoch) void relay.accept(value);
    };
    connection.current = {
      device,
      onDisconnect,
      characteristic: events,
      onValue,
      relay,
    };
    events.addEventListener("characteristicvaluechanged", onValue);
    await events.startNotifications();
    if (generation.current !== epoch) return;
    rememberScanner(localStorage, { bluetoothId: device.id, deviceId });
    setState((s) => ({
      ...s,
      connection: "connected",
      reconnecting: false,
      deviceId,
      name: device.name ?? "Classroom scanner",
      message:
        "Bluetooth connected. Tap a tag to check in or enroll a student.",
      success: true,
    }));
  }
  async function connect(deviceId: string) {
    const bluetooth = browserBluetooth();
    if (!deviceId || !bluetooth || !window.isSecureContext) return;
    release();
    const epoch = generation.current;
    setState((s) => ({
      ...s,
      connection: "connecting",
      reconnecting: false,
      deviceId,
      message:
        "Choose the Classroom scanner in your browser’s Bluetooth window.",
      lastUid: "",
      lastReceived: null,
      success: true,
    }));
    try {
      // Keep requestDevice directly in the button's user-gesture call chain.
      const device = await bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE] }],
      });
      if (generation.current !== epoch) return;
      await attach(device, deviceId, epoch);
    } catch (error) {
      if (generation.current !== epoch) return;
      release();
      // Closing the browser's scanner picker is a normal dismissal.
      if (error instanceof Error && error.name === "NotFoundError") {
        setState((s) => ({
          ...s,
          connection: "idle",
          message: "",
          success: true,
        }));
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Could not connect. Turn on Bluetooth and try again.";
      setState((s) => ({
        ...s,
        connection: "disconnected",
        message,
        success: false,
      }));
    }
  }
  return (
    <BluetoothContext.Provider value={{ state, connect, disconnect }}>
      {children}
    </BluetoothContext.Provider>
  );
}
