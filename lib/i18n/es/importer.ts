import type en from "../en/importer";
import type { Translation } from "../translate";

export default {
  readWordsFailed: "No se pudieron leer estas palabras.",
  readSentencesFailed: "No se pudieron leer estas oraciones.",
  fileTooBig: "Elige un archivo CSV de menos de 1 MB.",
  fileFailed: "No se pudo leer este archivo. Prueba un archivo CSV en UTF-8.",
  titleWords: "Importar vocabulario",
  titlePrompts: "Importar temas",
  titleSentences: "Importar oraciones",
  introWords:
    "Pega dos columnas, español y luego inglés, o elige un archivo CSV.",
  introPrompts:
    "Pega una pregunta en español por línea. Puedes agregar una traducción al inglés como segunda columna.",
  introSentences:
    "Pega una oración en español por línea. Puedes agregar una pista en inglés como segunda columna.",
  close: "Cerrar importación",
  method: "Forma de importar",
  addWords: "Agregar a las palabras actuales",
  addPrompts: "Agregar a los temas actuales",
  addSentences: "Agregar a las oraciones actuales",
  replaceWords: "Reemplazar todas las palabras actuales",
  replacePrompts: "Reemplazar todos los temas actuales",
  replaceSentences: "Reemplazar todas las oraciones actuales",
  sourceWords: "Pares de palabras",
  sourcePrompts: "Preguntas",
  sourceSentences: "Oraciones",
  placeholderWords: "Español,Inglés\nhola,hello\nadiós,goodbye",
  upload: "Subir CSV",
  previewWords: "Ver palabras",
  previewPrompts: "Ver temas",
  previewSentences: "Ver oraciones",
  toAdd: "{count} para agregar",
  toReplace: "{count} para reemplazar",
  duplicates: {
    one: " · 1 repetida omitida",
    other: " · {count} repetidas omitidas",
  },
  incomplete: " · {count} incompletas",
  previewLabelWords: "Vista previa del vocabulario",
  previewLabelPrompts: "Vista previa de los temas",
  previewLabelSentences: "Vista previa de las oraciones",
  spanishMissing: "Falta el español",
  englishMissing: "Falta el inglés",
  questionMissing: "Falta la pregunta en español",
  sentenceMissing: "Falta la oración en español",
  noHint: "Sin pista en inglés",
  statusNew: "Nueva",
  statusDuplicate: "Repetida",
  needsBoth: "Faltan las dos palabras",
  needsSpanish: "Falta el español",
  limitWords:
    "Un conjunto puede tener hasta 100 palabras. Quita algunas o elige Reemplazar.",
  limitPrompts:
    "Un conjunto puede tener hasta 100 temas. Quita algunos o elige Reemplazar.",
  limitSentences:
    "Un conjunto puede tener hasta 100 oraciones. Quita algunas o elige Reemplazar.",
  fixIncomplete:
    "Completa o quita las filas incompletas del texto y vuelve a ver la vista previa.",
  applyAddWords: {
    one: "Agregar 1 palabra",
    other: "Agregar {count} palabras",
  },
  applyAddPrompts: { one: "Agregar 1 tema", other: "Agregar {count} temas" },
  applyAddSentences: {
    one: "Agregar 1 oración",
    other: "Agregar {count} oraciones",
  },
  applyReplaceWords: {
    one: "Reemplazar con 1 palabra",
    other: "Reemplazar con {count} palabras",
  },
  applyReplacePrompts: {
    one: "Reemplazar con 1 tema",
    other: "Reemplazar con {count} temas",
  },
  applyReplaceSentences: {
    one: "Reemplazar con 1 oración",
    other: "Reemplazar con {count} oraciones",
  },
} satisfies Translation<typeof en>;
