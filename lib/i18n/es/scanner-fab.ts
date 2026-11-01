import type en from "../en/scanner-fab";
import type { Translation } from "../translate";

export default {
  scansGo: "Los registros van al Período {number} · {name}",
  scansGoManual:
    "Los registros van al Período {number} · {name}, elegido manualmente",
  noClass: "Ninguna clase recibe registros",
  noScans: "Todavía no hay registros",
  lastScanNow: "Último registro hace un momento",
  lastScanMinutes: "Último registro hace {count} min",
  lastScanHours: "Último registro hace {count} h",
  setUp: "Configurar escáner",
  openSetup: "Abrir la configuración del escáner.",
  useChrome: "Usa Chrome o Edge para Bluetooth",
  scannerOnPeriod: "Escáner activo · P{number}",
  scannerOn: "Escáner activo",
  scanner: "Escáner",
  connectingTo: "Conectando con el escáner",
  reconnectingLabel:
    "El escáner se está reconectando solo; selecciona para elegirlo de nuevo",
  connect: "Conectar escáner",
  connecting: "Conectando…",
  reconnecting: "Reconectando…",
} satisfies Translation<typeof en>;
