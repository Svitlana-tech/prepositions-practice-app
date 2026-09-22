import { z } from "zod";
import { PREPOSITIONS } from "@/lib/prepositions";

const fillInGapSchema = z.object({
  id: z.string().min(1),
  correctAnswer: z.string().min(1),
});

export const fillInDisplayModeSchema = z.enum(["type", "cards"]);
export type FillInDisplayMode = z.infer<typeof fillInDisplayModeSchema>;

/**
 * A text (one sentence, or a longer passage) with one or more gaps and no options shown
 * at all — the student types the missing word/phrase themselves (or, for a single-gap
 * preposition sentence, taps a curated "cards" grid instead — see displayMode). Matching
 * is case-sensitive; FILL_IN_SENTENCE and FILL_IN_TEXT share this exact shape and only
 * differ in label/topic scoping, so they use the same schema.
 */
export const fillInBlankPayloadSchema = z
  .object({
    text: z.string().min(1),
    gaps: z.array(fillInGapSchema).min(1),
    /** How the student answers. Missing on older tasks — treat as "type". */
    displayMode: fillInDisplayModeSchema.default("type"),
    /** Cards mode only: the curated set of tappable options (correct answer + distractors). */
    options: z.array(z.string().min(1)).optional(),
  })
  .superRefine((data, ctx) => {
    for (const gap of data.gaps) {
      if (!data.text.includes(`{${gap.id}}`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Text is missing gap marker {${gap.id}}`,
        });
      }
    }
    if (data.displayMode === "cards") {
      if (data.gaps.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cards mode only supports a sentence with a single gap",
        });
        return;
      }
      const answer = data.gaps[0].correctAnswer;
      if (!(PREPOSITIONS as readonly string[]).includes(answer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Cards mode needs the answer to be one of the preposition options — "${answer}" isn't in that list`,
        });
      }
      const options = data.options ?? [];
      if (options.length < 4 || options.length > 12) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Cards mode needs 4–12 options (got ${options.length})`,
        });
      }
      const invalid = options.filter((o) => !(PREPOSITIONS as readonly string[]).includes(o));
      if (invalid.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Options must all be preposition list words — invalid: ${invalid.join(", ")}`,
        });
      }
      if (!options.includes(answer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Options must include the correct answer "${answer}"`,
        });
      }
      if (new Set(options).size !== options.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Options list has duplicate words",
        });
      }
    }
  });
export type FillInBlankPayload = z.infer<typeof fillInBlankPayloadSchema>;

export const taskTypeSchemas = {
  FILL_IN_SENTENCE: fillInBlankPayloadSchema,
  FILL_IN_TEXT: fillInBlankPayloadSchema,
} as const;

export type TaskType = keyof typeof taskTypeSchemas;

export function validateTaskPayload(type: TaskType, payload: unknown) {
  return taskTypeSchemas[type].safeParse(payload);
}

export function pointsForPayload(type: TaskType, payload: unknown): number {
  switch (type) {
    case "FILL_IN_SENTENCE":
    case "FILL_IN_TEXT": {
      const p = payload as FillInBlankPayload;
      return p.gaps.length;
    }
  }
}
