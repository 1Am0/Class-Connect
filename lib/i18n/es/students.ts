import type en from "../en/students";
import type { Translation } from "../translate";

export default {
  scannerReturnFailed:
    "No se pudo devolver el escáner a la asistencia. Revisa la conexión e inténtalo de nuevo.",
  schoolIdRequired:
    "Escribe un ID escolar de seis dígitos para el nuevo estudiante.",
  openFailed:
    "El estudiante se guardó, pero no se pudo abrir su registro. Vuelve a la lista para editarlo.",
  saved: "Estudiante y clases guardados.",
  saveFailed: "No se pudo guardar. Inténtalo de nuevo.",
  cardSetupFailed:
    "No se pudo confirmar la configuración de la tarjeta. Inténtalo de nuevo.",
  scannerStartFailed: "No se pudo iniciar el escáner. Inténtalo de nuevo.",
  cardReady: "Tarjeta lista para {name}.",
  cardFailed: "No se pudo agregar la tarjeta. Inténtalo de nuevo.",
  editTitle: "Editar a {name}",
  addTitle: "Agregar un estudiante",
  cancelAndClose: "Cancelar y cerrar",
  firstName: "Nombre",
  lastName: "Apellido",
  schoolId: "ID escolar",
  required: "(obligatorio)",
  optional: "(opcional)",
  schoolEmail: "Correo escolar: {email}",
  schoolIdNeeded:
    "Falta el ID escolar para registrarse con QR. La asistencia y las tarjetas existentes siguen funcionando.",
  schoolIdHint:
    "Escribe el número escolar de seis dígitos; el correo escolar se crea automáticamente.",
  classes: "Clases",
  className: "Período {number} · {name}",
  archivedSuffix: " (archivada)",
  noClasses:
    "Agrega una clase en Inicio para incluir a este estudiante en la asistencia.",
  moreDetails: "Notas y otros datos",
  displayName: "Nombre preferido",
  notes: "Notas del salón",
  active: "Estudiante activo",
  activeHint:
    "Los estudiantes inactivos conservan su historial y no aparecen en la asistencia diaria.",
  savedShort: "Guardado",
  savedAddCard: ". Puedes agregar una tarjeta abajo.",
  savedEnd: ".",
  saving: "Guardando…",
  saveChanges: "Guardar cambios",
  saveStudent: "Guardar estudiante",
  cardAfterSave: "Puedes agregar una tarjeta opcional después de guardar.",
  cardSection: "Tarjeta del estudiante",
  scanCard: "Tarjeta",
  cardIntro: "Con una tarjeta, este estudiante se registra con un toque.",
  ready: "Lista",
  saveFirst: "Guarda los datos del estudiante antes de agregar una tarjeta.",
  makeActive: "Activa a este estudiante para agregar una tarjeta.",
  useScanner: "Usar escáner",
  cardDetected: "Tarjeta detectada",
  tapCard: "Acerca la tarjeta del estudiante",
  timedOut: "Se agotó el tiempo para configurar la tarjeta",
  confirmCard: "Confirma que esta tarjeta es de {name}.",
  holdCard: "Acerca la tarjeta al escáner conectado.",
  startAgain: "Empieza de nuevo cuando estés listo.",
  paused:
    "La asistencia está en pausa en este escáner hasta que termines o canceles.",
  replaceCard: "Cambiar tarjeta",
  addCard: "Agregar tarjeta",
  tryAgain: "Intentar de nuevo",
  noScanner: "Agrega y conecta un escáner en Ajustes para leer una tarjeta.",
  cardTaken: "Esta tarjeta ya es de otro estudiante. Usa otra tarjeta.",
  assignCard: "Asignar tarjeta a {name}",
  studentFallback: "estudiante",
  cancelFailed:
    "No se pudo cancelar la configuración de la tarjeta. Inténtalo de nuevo.",
  cancelSetup: "Cancelar configuración de tarjeta",
  cardDetails: "Datos de la tarjeta e ingreso manual",
  currentCard: "Número de tarjeta actual: <code>{uid}</code>",
  detectedCard: "Número de tarjeta detectado: <code>{uid}</code>",
  manualEntry: "Escribir un número de tarjeta",
  cancelBeforeManual:
    "Cancela la configuración de la tarjeta antes de cambiar al ingreso manual.",
  cardNumber: "Número de tarjeta",
  cardNumberHint: "Usa el número hexadecimal completo de 4, 7 o 10 bytes.",
} satisfies Translation<typeof en>;
