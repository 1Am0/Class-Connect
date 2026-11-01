import type en from "../en/check-in";
import type { Translation } from "../translate";

export default {
  pageTitle: "Registro de estudiantes · Class Connect",
  scanFirst: "Escanea el código QR que muestra tu maestro para registrarte.",
  invalid:
    "Este código QR no es válido. Escanea el código que muestra tu maestro.",
  changed: "Este código QR cambió. Escanea de nuevo el código de la pantalla.",
  failed: "No se pudo registrar tu asistencia. Inténtalo de nuevo.",
  noGoogleCredential:
    "Google no completó el inicio de sesión. Inténtalo de nuevo.",
  googleLoadFailed:
    "No se cargó el inicio de sesión de Google. Revisa tu conexión e inténtalo de nuevo.",
  checkedIn: "Ya estás registrado",
  checkedInName: "Ya estás registrado, {name}",
  already: "Ya te habías registrado",
  otherStatus: "Tu asistencia ya está marcada",
  checkedInBody: "Tu maestro puede ver tu asistencia.",
  alreadyBody: "Tu asistencia ya estaba marcada para esta clase.",
  otherBody: "Tu maestro ya marcó tu asistencia.",
  title: "Regístrate en la clase",
  googleIntro:
    "Usa la cuenta escolar de Google que tu maestro agregó a la lista de la clase.",
  idIntro: "Escribe tu ID de estudiante de seis dígitos para registrarte.",
  idError: "Escribe tu ID de estudiante de seis dígitos (por ejemplo, 123456).",
  studentId: "ID de estudiante",
  checkingIn: "Registrando…",
  checkIn: "Registrarme",
  googleLabel: "Iniciar sesión con la cuenta escolar de Google",
  checkingYouIn: "Registrando tu asistencia…",
} satisfies Translation<typeof en>;
