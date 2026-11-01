import type en from "../en/qr";
import type { Translation } from "../translate";

export default {
  loadFailed: "No se pudo mostrar el código QR.",
  title: "Código QR de la clase",
  close: "Cerrar código QR",
  making: "Creando el código QR de hoy…",
  imageAlt: "Código QR para registrarse en {name}",
  open: "El registro está abierto para esta clase.",
  closed:
    "Los estudiantes pueden registrarse durante el horario de esta clase.",
  rotates:
    "El código cambia cada {seconds} segundos, así que una foto de él deja de funcionar.",
  className: "Período {number} · {name}",
} satisfies Translation<typeof en>;
