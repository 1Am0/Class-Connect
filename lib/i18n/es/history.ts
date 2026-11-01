import type en from "../en/history";
import type { Translation } from "../translate";

export default {
  controls: "Controles y estadísticas del historial de asistencia",
  previousMonth: "Mes anterior",
  nextMonth: "Mes siguiente",
  monthly: "Asistencia mensual",
  outsideMonth: "Fuera del mes",
  allAbsent: "Todos ausentes · {count}",
  attended: "{rate}% asistió · {count}",
  noStatuses: "Sin estados guardados",
  weekend: "Fin de semana",
  upcoming: "Próximo",
  noRecords: "Sin registros",
  dayLabel: "{date}: {detail}. Ver resumen de asistencia",
  calendarHint:
    "Los días más oscuros tuvieron más asistencia. Elige un día para ver su resumen; usa las flechas para moverte entre días.",
  summary: "Resumen de asistencia",
  rate: "Tasa de asistencia",
  rateDetail:
    "{here} de {records} registros guardados marcados como presente o tarde",
  statusCounts: "Cantidad por estado",
  noDay: "No hay asistencia guardada para este día.",
  noDayBody: "Los estudiantes sin estado guardado no se cuentan como ausentes.",
} satisfies Translation<typeof en>;
