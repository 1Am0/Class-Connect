import type { Namespace } from "../translate";

// The class QR code dialog.
export default {
  loadFailed: "Could not show the QR code.",
  title: "Class QR code",
  close: "Close QR code",
  making: "Making today’s QR code…",
  imageAlt: "QR code to check in to {name}",
  open: "Check-in is open for this class.",
  closed: "Students can check in during this class's scheduled time.",
  rotates:
    "The code changes every {seconds} seconds, so a photo of it stops working.",
  className: "Period {number} · {name}",
} satisfies Namespace;
