import type en from "../en/home";
import type { Translation } from "../translate";

export default {
  timingNow: "En clase",
  timingNext: "Sigue",
  timingLater: "Más tarde hoy",
  timingDone: "Terminada",
  timingOff: "No hay clase hoy",
  doesNotMeetToday: "No hay clase hoy",
  noClassToday: "No hay clase hoy",
  tooManyClasses: "Puedes tener hasta 20 clases.",
  restored: "{name} volvió a tus clases activas.",
  archivedScannerReset: "{name} se archivó. El escáner ahora sigue el horario.",
  archived: "{name} se archivó. El historial de asistencia sigue disponible.",
  updateFailed: "No se pudo actualizar esta clase.",
  manageClasses: "Administrar clases",
  today: "Hoy",
  addClass: "Agregar clase",
  activeClasses: "Clases activas",
  className: "Período {number} · {name}",
  openClass: "Abrir clase",
  archiveEllipsis: "Archivar…",
  noActiveClasses: "No hay clases activas",
  noActiveClassesBody:
    "Agrega una clase para empezar a tomar asistencia, o restaura una del archivo de abajo.",
  archivedClasses: "Clases archivadas",
  archivedClassesBody:
    "La asistencia anterior sigue disponible después de archivar una clase.",
  viewHistory: "Ver historial",
  restore: "Restaurar",
  noArchived: "Todavía no hay clases archivadas.",
  yourClassesToday: "Tus clases de hoy",
  openClassLabel: "Abrir {name}. {timing}. {here} de {total} presentes hoy.",
  hereToday: " / {total} presentes hoy",
  scannerHere: "Los registros del escáner van aquí",
  takeAttendance: "Tomar asistencia",
  takeAttendanceFor: "Tomar asistencia de {name}",
  attendanceHistory: "Historial de asistencia",
  attendanceHistoryFor: "Historial de asistencia de {name}",
  firstClass: "Agrega tu primera clase",
  firstClassBody:
    "Escribe su nombre y horario para empezar a tomar asistencia.",
  archiveTitle: "¿Archivar esta clase?",
  archiveBody:
    "<b>{name}</b> saldrá de tus clases activas. Sus estudiantes y su historial de asistencia se guardarán, y podrás restaurarla después.",
  archiveScanner:
    "El escáner está asignado a esta clase. Al archivarla, el escáner volverá a seguir el horario escolar.",
  keepClass: "Conservar clase",
  archiving: "Archivando…",
  archiveClass: "Archivar clase",
} satisfies Translation<typeof en>;
