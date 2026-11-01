import type en from "../en/tools";
import type { Translation } from "../translate";

export default {
  resetDone:
    "Selección reiniciada. Todos los estudiantes presentes pueden salir de nuevo.",
  notPresent: "Ese estudiante ya no está presente. Elige de nuevo.",
  picker: "Selector de estudiantes",
  left: "Quedan {left} de {total}",
  reset: "Reiniciar",
  needPresent: "Marca estudiantes presentes en una clase para usar la ruleta.",
  allPicked: "Ya salieron todos. Elige Reiniciar para empezar de nuevo.",
  spin: "Girar la ruleta de estudiantes",
  picking: "Eligiendo…",
  pick: "Elegir un estudiante",
  selected: "Estudiante elegido",
  close: "Cerrar",
  groupSettings: "Opciones de grupos",
  groupBy: "Agrupar por",
  groupMethod: "Forma de agrupar",
  byCount: "Número de grupos",
  bySize: "Estudiantes por grupo",
  groups: "Grupos",
  quantity: "Cantidad por grupo",
  wholeNumber: "Escribe un número entero del 1 al 100.",
  shuffleAgain: "Mezclar de nuevo",
  makeGroups: "Formar grupos",
  stale:
    "La asistencia cambió. Elige “Mezclar de nuevo” para actualizar los grupos.",
  groupCount: { one: "1 grupo", other: "{count} grupos" },
  copyHeading: "GRUPO {number}",
  copy: "Copiar grupos",
  print: "Imprimir",
  group: "Grupo {number}",
  members: { one: "1 estudiante", other: "{count} estudiantes" },
  nobody: "Todavía no hay estudiantes presentes",
  nobodyBody:
    "Marca estudiantes presentes en una clase y vuelve para formar grupos.",
} satisfies Translation<typeof en>;
