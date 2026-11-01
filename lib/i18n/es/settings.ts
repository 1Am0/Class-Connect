import type en from "../en/settings";
import type { Translation } from "../translate";

export default {
  sections: "Secciones de configuración",
  navAppearance: "Apariencia",
  navAttendance: "Asistencia",
  navClassroom: "Cuenta y jornada escolar",
  navData: "Datos de estudiantes",
  appearance: "Apariencia",
  theme: "Tema",
  themeLight: "Claro",
  themeDark: "Oscuro",
  themeSystem: "Sistema",
  language: "Idioma",
  languageHint: "Se guarda en este navegador.",
  reducedMotion: "Menos movimiento",
  reducedMotionHint:
    "Usa animaciones más cortas. Siempre se respeta la preferencia de tu sistema.",
  attendance: "Asistencia",
  attendanceIntro:
    "Herramientas opcionales para la lista de la clase. Se guardan en este navegador.",
  notes: "Notas de asistencia",
  notesHint:
    "Agrega un motivo corto a la marca de un estudiante, como “enfermería” o “llamó un familiar”. Las notas se guardan con la asistencia y se incluyen al exportar CSV.",
  shortcuts: "Atajos de teclado",
  shortcutsHint:
    "En la lista: ↑ ↓ o J K para moverte entre estudiantes, P A L E para marcarlos y pasar al siguiente (presente, ausente, tarde, justificado), N para agregar una nota, / para buscar, Ctrl+Z para deshacer tus cambios uno por uno.",
  timezoneTitle: "Zona horaria de la escuela",
  saved: "Configuración guardada.",
  commonTimezones: "Zonas horarias comunes",
  tzPacific: "Hora del Pacífico (Los Ángeles)",
  tzMountain: "Hora de la montaña (Denver)",
  tzCentral: "Hora del centro (Chicago)",
  tzEastern: "Hora del este (Nueva York)",
  tzHawaii: "Hora de Hawái",
  tzLondon: "Reino Unido (Londres)",
  tzUtc: "Tiempo universal coordinado",
  timezoneHint:
    "Las fechas de asistencia y la selección automática de período usan esta zona horaria.",
  savePreferences: "Guardar preferencias",
  demoPrivacy:
    "Los datos de la demostración se quedan en esta computadora. En producción se necesita Supabase y una cuenta de maestro.",
  privacy:
    "Los registros de tu salón solo están disponibles en tu cuenta de maestro.",
  editSchedule: "Editar horario semanal",
  scheduleHint:
    "El destino automático del escáner sigue estos horarios. Un destino manual se mantiene hasta que lo quites en Escáner.",
  effects: "Efectos de sonido",
  effectsHint: "Registros, errores de lectura, ruleta y grupos.",
  data: "Datos de estudiantes",
  dataNote: "Estas acciones afectan a todo tu salón.",
  activeStudents: {
    one: "1 estudiante activo. Se conservan el historial de asistencia y las clases.",
    other:
      "{count} estudiantes activos. Se conservan el historial de asistencia y las clases.",
  },
  archiveStudents: "Archivar estudiantes actuales…",
  cardAssignments: {
    one: "1 tarjeta asignada. Los estudiantes y el historial se conservan.",
    other:
      "{count} tarjetas asignadas. Los estudiantes y el historial se conservan.",
  },
  clearCards: "Quitar las tarjetas RFID…",
  allData:
    "{students} estudiantes y {records} registros de asistencia. Se eliminan para siempre.",
  deleteAll: "Eliminar todos los datos de estudiantes…",
  archiveTitle: "Archivar estudiantes actuales",
  archivePhrase: "ARCHIVAR ESTUDIANTES",
  archiveBody:
    "Desactiva a todos los estudiantes actuales y quita sus tarjetas RFID. Se conservan el historial de asistencia y el horario de clases. Puedes reactivar estudiantes después.",
  clearTitle: "Quitar las tarjetas RFID",
  clearPhrase: "QUITAR TARJETAS",
  clearBody:
    "Quita todas las tarjetas asignadas. Los estudiantes y el historial de asistencia se conservan. Hay que asignar las tarjetas de nuevo antes de poder registrar.",
  deleteTitle: "Eliminar todos los datos de estudiantes",
  deletePhrase: "ELIMINAR TODOS LOS DATOS",
  deleteBody:
    "Elimina para siempre a todos los estudiantes, sus clases, tarjetas RFID, registros y sesiones de asistencia. Se conservan tu cuenta, las clases, los escáneres y las preferencias. Esto no se puede deshacer.",
  currentData:
    "Datos actuales: {students} estudiantes · {cards} tarjetas · {records} registros de asistencia",
  understand: "Entiendo lo que va a cambiar esta acción.",
  typeToConfirm: "Escribe <b>{phrase}</b> para confirmar",
  cancel: "Cancelar",
  archivedDone: "Estudiantes archivados y tarjetas quitadas.",
  clearedDone: "Tarjetas de estudiantes quitadas.",
  deletedDone: "Datos de estudiantes eliminados para siempre.",
  working: "Procesando…",
  deleteConfirm: "Eliminar todos los datos de estudiantes para siempre",
  archiveConfirm: "Archivar a todos los estudiantes",
  clearConfirm: "Quitar todas las tarjetas RFID",
} satisfies Translation<typeof en>;
