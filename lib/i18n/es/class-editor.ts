import type en from "../en/class-editor";
import type { Translation } from "../translate";

export default {
  editTitle: "Editar clase",
  addTitle: "Agregar una clase",
  cancelAndClose: "Cancelar y cerrar",
  needBellTime:
    "Primero agrega un horario de timbre para este período en Configuración.",
  invalidTime: "Escribe una hora de inicio y de fin válidas.",
  importFailed:
    "La clase se guardó, pero no se pudo abrir la importación de la lista. Vuelve a abrir la clase e inténtalo de nuevo.",
  savedImport: "Clase guardada. Ahora agrega su lista.",
  saved: "Clase guardada.",
  saveFailed: "No se pudo guardar esta clase. Inténtalo de nuevo.",
  name: "Nombre de la clase",
  period: "Período",
  periodOption: "Período {number}",
  classTime: "Horario de la clase",
  schoolSchedule: "Horario escolar",
  customTime: "Horario personalizado",
  startsAt: "Empieza a las",
  endsAt: "Termina a las",
  archivedHint:
    "Esta clase está archivada. Guarda tus cambios y luego restáurala desde Administrar clases cuando su número de período esté libre.",
  saveBeforeImport:
    "Guarda los cambios de la clase antes de importar una lista.",
  importRoster: "Importar lista",
  saveAndImport: "Guardar e importar lista",
  saving: "Guardando…",
  save: "Guardar clase",
} satisfies Translation<typeof en>;
