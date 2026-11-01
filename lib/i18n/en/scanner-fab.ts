import type { Namespace } from "../translate";

// The floating Bluetooth button.
export default {
  scansGo: "Scans go to Period {number} · {name}",
  scansGoManual: "Scans go to Period {number} · {name}, chosen manually",
  noClass: "No class is receiving scans",
  noScans: "No scans yet",
  lastScanNow: "Last scan just now",
  lastScanMinutes: "Last scan {count} min ago",
  lastScanHours: "Last scan {count} hr ago",
  setUp: "Set up scanner",
  openSetup: "Open scanner setup.",
  useChrome: "Use Chrome or Edge for Bluetooth",
  scannerOnPeriod: "Scanner on · P{number}",
  scannerOn: "Scanner on",
  scanner: "Scanner",
  connectingTo: "Connecting to scanner",
  reconnectingLabel:
    "Scanner reconnecting by itself; select to choose it again",
  connect: "Connect scanner",
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
} satisfies Namespace;
