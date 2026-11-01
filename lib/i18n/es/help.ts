import type en from "../en/help";
import type { Translation } from "../translate";

export default {
  title: "Ayuda y soporte",
  intro: "Encuentra respuestas y aprende a usar las herramientas de tu salón.",
  close: "Cerrar Ayuda y soporte",
  searchLabel: "Buscar artículos de ayuda",
  searchPlaceholder: "Busca ayuda o haz una pregunta…",
  clear: "Borrar",
  back: "Atrás",
  breadcrumb: "Ayuda y soporte / {category}",
  steps: "Pasos",
  tip: "Consejo",
  largerImage: "Abrir imagen más grande",
  openPage: "Abrir esta página",
  relatedLabel: "Artículos de ayuda relacionados",
  related: "Ayuda relacionada",
  helpful: "¿Te sirvió este artículo?",
  thanks:
    "Gracias por tu opinión. Solo se guarda en este navegador; no se envió al equipo del proyecto.",
  clearFeedback: "Borrar mi opinión",
  yes: "Sí",
  no: "No",
  unclear: "¿Qué no quedó claro? (opcional)",
  saveFeedback: "Guardar opinión",
  feedbackNote:
    "Tu opinión solo se guarda en este navegador y no se envía al equipo del proyecto.",
  results: "Resultados",
  noResults: "No hay artículos que coincidan. Prueba con otras palabras.",
  backToHelp: "Volver a Ayuda",
  forPage: "Ayuda para esta página",
  showFewer: "Ver menos",
  viewAll: "Ver los {count}",
  topics: "Temas de ayuda",
  articles: { one: "1 artículo", other: "{count} artículos" },
  popular: "Preguntas frecuentes",
  stillNeed: "¿Todavía necesitas ayuda?",
  stillNeedBody:
    "¿No encuentras una respuesta? Describe el problema o sugiere un tema de ayuda.",
  closeReport: "Cerrar reporte",
  report: "Reportar un problema",
  trouble: "¿Con qué tienes problemas?",
  saveDraft: "Guardar borrador en este dispositivo",
  clearDraft: "Borrar borrador",
  draftSaved: "Borrador guardado en este dispositivo.",
  draftNote:
    "Los borradores se quedan en este navegador. Todavía no se envía nada al equipo del proyecto. No incluyas nombres ni ID de estudiantes.",
} satisfies Translation<typeof en>;
