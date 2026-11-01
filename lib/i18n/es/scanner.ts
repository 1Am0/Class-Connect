import type en from "../en/scanner";
import type { Translation } from "../translate";

export default {
  assigning:
    "<b>{name} está asignando tarjetas.</b> Termina aquí cuando quieras volver a tomar asistencia.",
  resume: "Reanudar asistencia",
  practice: "Probar un registro de práctica",
  practiceIntro:
    "Mira cómo funciona un registro sin escáner. Esto marca la asistencia en tu clase actual.",
  scanner: "Escáner",
  practiceScanner: "Escáner de práctica",
  student: "Estudiante",
  practiceStudent: "Estudiante de práctica",
  chooseStudent: "Elige un estudiante",
  unassignedTag: "Tarjeta sin asignar",
  customTag: "Número de tarjeta personalizado",
  tapFailed:
    "No se pudo guardar el registro. Revisa tu conexión e inténtalo de nuevo.",
  checkingIn: "Registrando…",
  tryTap: "Probar este registro",
  testTag: "Probar un número de tarjeta",
  tagNumber: "Número de tarjeta (UID)",
  tagPlaceholder: "Por ejemplo, 04A7318C",
  settings: "Configuración del escáner",
  settingsIntro:
    "Tu escáner funciona con todas las clases. Normalmente solo necesitas estas opciones al configurarlo.",
  lastConnected: "Última conexión: {time}",
  notConnectedYet: "Todavía no se ha conectado",
  enabled: "Activado",
  demoScanner:
    "Esta demostración ya tiene un escáner configurado. Conéctalo arriba para probar tarjetas reales.",
  added: "Escáner agregado. Ya puedes conectarlo por Bluetooth.",
  scannerName: "Nombre del escáner",
  scannerNamePlaceholder: "Mi escáner del salón",
  adding: "Agregando…",
  add: "Agregar escáner",
  cancel: "Cancelar",
  addAnother: "Agregar otro escáner",
  wifiToken: "Token opcional para Wi-Fi",
  wifiIntro:
    "Bluetooth funciona sin este token. Para un escáner que se conecta directamente por Wi-Fi, guarda estos valores en su archivo secrets.h. El token solo se muestra durante esta visita.",
  deviceIdentifier: "Identificador del dispositivo",
  secretToken: "Token secreto",
  dismissToken: "Ocultar token",
  technical: "Datos técnicos",
  readyForClass: "Escáner listo para esta clase.",
  titlePaused: "El escáner está en pausa",
  titleAssigning: "Asignando la tarjeta de un estudiante",
  titleConnected: "Escáner conectado",
  titleChoose: "Elige tu escáner",
  titleConnect: "Conecta tu escáner",
  connection: "Conexión del escáner",
  scannerToConnect: "Escáner para conectar",
  setUp: "Configurar escáner",
  connected: "Conectado",
  updating: "Actualizando…",
  useScanner: "Usar escáner",
  connecting: "Conectando…",
  connect: "Conectar escáner",
  useChrome: "Usa Chrome o Edge para Bluetooth.",
  bodyPaused:
    "Activa este escáner en Configuración del escáner antes de que los estudiantes registren.",
  bodyAssigning:
    "Termina de asignar la tarjeta en Estudiantes antes de tomar asistencia.",
  bodyConnected: "Los estudiantes pueden acercar su tarjeta para registrarse.",
  bodyChoose:
    "Selecciona Classroom en la ventana de Bluetooth y luego elige Vincular.",
  bodyConnect: "Enciende el escáner y luego conéctalo a esta computadora.",
  openInChrome:
    "Abre esta página en Chrome o Edge para conectar tu escáner. Aquí también puedes tomar asistencia a mano.",
  setUpA: "Configurar un escáner",
  addOrEnable:
    "Agrega o activa un escáner en Configuración del escáner, más abajo.",
  openAttendance: "Abrir la asistencia de la clase",
  waitingSignal: "Esperando la primera señal del escáner…",
  noSignal: "No hay señal reciente. Mantén el escáner encendido y cerca.",
  keepOpen:
    "Mantén esta pestaña abierta y la computadora encendida. Puedes cambiar de página.",
  connectionDetails: "Datos de la conexión",
  needHelp: "¿Necesitas ayuda para conectar?",
  lastTag: "Último número de tarjeta: <code>{uid}</code>",
  disconnect: "Desconectar escáner",
  firmware:
    "El escáner necesita tener instalado el programa <b>ClassroomBluetooth</b>. Al conectar, elige el dispositivo llamado <b>Classroom-…</b>.",
  wifiNote:
    "La computadora usa el Wi-Fi de tu escuela; el escáner no necesita conectarse a él.",
  browserNote:
    "Bluetooth funciona en Chrome o Edge de escritorio, en la dirección local de esta computadora o en un sitio HTTPS seguro. La computadora usa el Wi-Fi de tu escuela; el escáner no necesita conectarse a él.",
  destinationUpdated: "Destino del escáner actualizado.",
  routingFailed:
    "No se pudo cambiar el destino del escáner. Inténtalo de nuevo.",
  routing: "Destino del escáner",
  scansGo: "Los registros van al Período {number} · {name}",
  noClassNow: "Ninguna clase recibe registros en este momento",
  manualHint:
    "Destino manual · se mantiene hasta que elijas Seguir el horario de clases.",
  autoHint: "Destino automático · sigue tu horario escolar guardado.",
  mismatch:
    "Los registros van a otra clase. Ver esta lista no cambia su destino.",
  noActive:
    "Tu horario no tiene una clase activa ahora. Elige un destino para recibir registros.",
  sendHere: "Enviar registros a esta clase",
  follow: "Seguir el horario de clases",
  destination: "Destino de la asistencia",
  classOption: "Período {number} · {name}",
  setUpClass: "Configurar una clase",
} satisfies Translation<typeof en>;
