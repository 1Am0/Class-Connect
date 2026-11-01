// zod/mini keeps this schema small enough for the editor to check sets in the
// browser; the API route parses with this same schema, so the rules match.
import * as z from "zod/mini";

const text = (min: number) =>
  z.string().check(z.trim(), z.minLength(min), z.maxLength(500));
const optionalText = () => z.optional(text(0));

const item = z.object({
  id: z.uuid(),
  text: text(1),
  supporting_text: text(0),
  sentence_starter: optionalText(),
  follow_up_question: optionalText(),
  grammar_explanation: optionalText(),
  accepted_answers: z.optional(z.array(text(1)).check(z.maxLength(10))),
});

export const activitySetInput = z
  .object({
    id: z.optional(z.uuid()),
    name: z.string().check(z.trim(), z.minLength(1), z.maxLength(100)),
    kind: z.enum(["vocabulary", "conversation", "scramble"]),
    items: z.array(item).check(z.minLength(1), z.maxLength(100)),
  })
  .check(
    z.superRefine((set, context) => {
      if (new Set(set.items.map((entry) => entry.id)).size !== set.items.length)
        context.addIssue({
          code: "custom",
          message: "Each item must have its own ID.",
          path: ["items"],
        });
      if (set.kind === "vocabulary")
        set.items.forEach((entry, index) => {
          if (!entry.supporting_text)
            context.addIssue({
              code: "custom",
              message: "Add a meaning for each vocabulary word.",
              path: ["items", index, "supporting_text"],
            });
        });
      if (set.kind === "scramble")
        set.items.forEach((entry, index) => {
          const words = entry.text.split(/\s+/).sort().join(" ");
          entry.accepted_answers?.forEach((answer, answerIndex) => {
            if (answer.split(/\s+/).sort().join(" ") !== words)
              context.addIssue({
                code: "custom",
                message:
                  "Alternative answers must use the same words as the saved sentence.",
                path: ["items", index, "accepted_answers", answerIndex],
              });
          });
        });
    }),
  );

export type ActivitySetInput = z.infer<typeof activitySetInput>;
