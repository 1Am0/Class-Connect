import type en from "../en/scanner-status";
import type { Translation } from "../translate";

export default {
  unsupported: "Bluetooth no disponible",
  connected: "Escáner conectado",
  connecting: "Conectando…",
  reconnecting: "Reconectando el escáner",
  offline: "Escáner sin conectar",
} satisfies Translation<typeof en>;
