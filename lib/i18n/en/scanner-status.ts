import type { Namespace } from "../translate";

// The scanner's connection, wherever it's shown.
export default {
  unsupported: "Bluetooth unavailable",
  connected: "Scanner connected",
  connecting: "Connecting…",
  reconnecting: "Scanner reconnecting",
  offline: "Scanner not connected",
} satisfies Namespace;
