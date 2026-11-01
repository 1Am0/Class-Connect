import type { ActivitySet, ActivitySetItem } from "@/types";

// Built-in, read-only sets so every account can try each activity right away.
// They live in code, not the database, and are listed after the teacher's own.
export const SAMPLE_TEACHER_ID = "sample";
const stamp = "2026-01-01T00:00:00.000Z";
const items = (prefix: string, rows: Omit<ActivitySetItem, "id">[]) =>
  rows.map((row, index) => ({
    ...row,
    id: `${prefix}${String(index + 1).padStart(12, "0")}`,
  }));

export const sampleActivitySets: ActivitySet[] = [
  {
    id: "5a000000-0000-4000-8000-000000000001",
    teacher_id: SAMPLE_TEACHER_ID,
    name: "Sample · Getting to know you",
    kind: "conversation",
    created_at: stamp,
    updated_at: stamp,
    items: items("5a000001-0000-4000-8000-", [
      {
        text: "¿Cómo te llamas?",
        supporting_text: "What is your name?",
        sentence_starter: "Me llamo…",
        follow_up_question: "¿Cómo se escribe tu nombre?",
      },
      {
        text: "¿De dónde eres?",
        supporting_text: "Where are you from?",
        sentence_starter: "Soy de…",
        follow_up_question: "¿Qué te gusta de tu ciudad?",
      },
      {
        text: "¿Qué te gusta hacer los fines de semana?",
        supporting_text: "What do you like to do on weekends?",
        sentence_starter: "Me gusta…",
        follow_up_question: "¿Con quién lo haces?",
      },
      {
        text: "¿Cuál es tu comida favorita?",
        supporting_text: "What is your favorite food?",
        sentence_starter: "Mi comida favorita es…",
        follow_up_question: "¿Sabes prepararla?",
      },
      {
        text: "¿Qué clase te gusta más y por qué?",
        supporting_text: "Which class do you like most, and why?",
        sentence_starter: "Me gusta más… porque…",
        follow_up_question: "¿Qué clase es la más difícil?",
      },
      {
        text: "¿Qué hiciste ayer después de la escuela?",
        supporting_text: "What did you do yesterday after school?",
        sentence_starter: "Ayer yo…",
        follow_up_question: "¿Fue divertido?",
      },
    ]),
  },
  {
    id: "5a000000-0000-4000-8000-000000000002",
    teacher_id: SAMPLE_TEACHER_ID,
    name: "Sample · Everyday sentences",
    kind: "scramble",
    created_at: stamp,
    updated_at: stamp,
    items: items("5a000002-0000-4000-8000-", [
      {
        text: "Yo como el desayuno a las siete",
        supporting_text: "I eat breakfast at seven.",
        grammar_explanation:
          "Time phrases like “a las siete” usually come at the end.",
      },
      {
        text: "Mi hermana tiene un perro grande",
        supporting_text: "My sister has a big dog.",
        grammar_explanation: "Most adjectives follow the noun: perro grande.",
      },
      {
        text: "Nosotros vamos al parque mañana",
        supporting_text: "We are going to the park tomorrow.",
        grammar_explanation: "a + el contracts to “al”.",
      },
      {
        text: "La biblioteca está cerca de la escuela",
        supporting_text: "The library is near the school.",
        grammar_explanation: "Use estar for location.",
      },
      {
        text: "Ellos no quieren estudiar hoy",
        supporting_text: "They do not want to study today.",
        grammar_explanation: "“No” goes right before the conjugated verb.",
      },
    ]),
  },
  {
    id: "5a000000-0000-4000-8000-000000000003",
    teacher_id: SAMPLE_TEACHER_ID,
    name: "Sample · Classroom words",
    kind: "vocabulary",
    created_at: stamp,
    updated_at: stamp,
    items: items("5a000003-0000-4000-8000-", [
      { text: "el lápiz", supporting_text: "the pencil" },
      { text: "el cuaderno", supporting_text: "the notebook" },
      { text: "la mochila", supporting_text: "the backpack" },
      { text: "el escritorio", supporting_text: "the desk" },
      { text: "la pizarra", supporting_text: "the board" },
      { text: "la tarea", supporting_text: "the homework" },
      { text: "el reloj", supporting_text: "the clock" },
      { text: "la ventana", supporting_text: "the window" },
    ]),
  },
];

export const isSampleSet = (set: Pick<ActivitySet, "teacher_id">) =>
  set.teacher_id === SAMPLE_TEACHER_ID;

/** The teacher's own sets first, then the built-in samples. */
export const withSampleSets = (sets: ActivitySet[] | undefined) => [
  ...(sets ?? []),
  ...sampleActivitySets,
];
