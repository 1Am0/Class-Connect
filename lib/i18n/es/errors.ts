import type en from "../en/errors";
import type { Translation } from "../translate";

export default {
  unavailableTitle: "Tu salón no está disponible por el momento.",
  unavailableBody:
    "No pudimos cargar tu salón. Inténtalo de nuevo en un momento.",
  signInLink: "Ir a iniciar sesión",
  setupTitle: "Conectemos tu salón.",
  setupBody:
    "Configura Supabase siguiendo el README o activa DEMO_MODE en desarrollo local.",
  crashTitle: "Algo salió mal en esta página.",
  crashBody:
    "Lo que ya guardaste está a salvo. Inténtalo de nuevo o vuelve a Inicio.",
  retry: "Intentar de nuevo",
  home: "Ir a Inicio",
  notFoundTitle: "No encontramos esa página.",
  notFoundBody: "Es posible que el enlace esté mal escrito o ya no exista.",
  loadTitle: "Class Connect no se pudo cargar.",
  loadBody:
    "Lo que ya guardaste está a salvo. Inténtalo de nuevo en un momento.",
} satisfies Translation<typeof en>;
