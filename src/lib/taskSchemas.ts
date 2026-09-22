import { z } from "zod";
import { PREPOSITIONS } from "@/lib/prepositions";

export const sentenceMcqPayloadSchema = z.object({
  sentence: z.string().min(1).refine((s) => s.includes("___"), {
    message: 'Sentence must contain a gap marker "___"',
  }),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});
export type SentenceMcqPayload = z.infer<typeof sentenceMcqPayloadSchema>;

const mcqGapSchema = z.object({
  id: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});

export const textMcqPayloadSchema = z
  .object({
    text: z.string().min(1),
    gaps: z.array(mcqGapSchema).min(1),
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
  });
export type TextMcqPayload = z.infer<typeof textMcqPayloadSchema>;

const clozeGapSchema = z.object({
  id: z.string().min(1),
  correctAnswer: z.string().min(1),
});

export const clozeDisplayModeSchema = z.enum(["dropdown", "wordBank"]);
export type ClozeDisplayMode = z.infer<typeof clozeDisplayModeSchema>;

export const clozeWordBankPayloadSchema = z
  .object({
    text: z.string().min(1),
    gaps: z.array(clozeGapSchema).min(1),
    wordBank: z.array(z.string().min(1)).min(1),
    /** How students fill the gaps. Missing on older tasks — treat as "dropdown". */
    displayMode: clozeDisplayModeSchema.default("dropdown"),
  })
  .superRefine((data, ctx) => {
    for (const gap of data.gaps) {
      if (!data.text.includes(`{${gap.id}}`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Text is missing gap marker {${gap.id}}`,
        });
      }
      if (!data.wordBank.includes(gap.correctAnswer)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Word bank must include the correct answer "${gap.correctAnswer}" for gap {${gap.id}}`,
        });
      }
    }
  });
export type ClozeWordBankPayload = z.infer<typeof clozeWordBankPayloadSchema>;

const paragraphMatchGapSchema = z.object({
  id: z.string().min(1),
  correctParagraphId: z.string().min(1),
});

const paragraphSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

export const paragraphMatchPayloadSchema = z
  .object({
    textWithGaps: z.string().min(1),
    gaps: z.array(paragraphMatchGapSchema).min(1),
    paragraphs: z.array(paragraphSchema).min(2),
  })
  .superRefine((data, ctx) => {
    if (data.paragraphs.length !== data.gaps.length + 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Paragraph list must have exactly one extra paragraph (expected ${
          data.gaps.length + 1
        }, got ${data.paragraphs.length})`,
      });
    }
    const paragraphIds = new Set(data.paragraphs.map((p) => p.id));
    for (const gap of data.gaps) {
      if (!data.textWithGaps.includes(`[${gap.id}]`)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Text is missing gap marker [${gap.id}]`,
        });
      }
      if (!paragraphIds.has(gap.correctParagraphId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Gap [${gap.id}] references a paragraph id that doesn't exist`,
        });
      }
    }
  });
export type ParagraphMatchPayload = z.infer<typeof paragraphMatchPayloadSchema>;

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
  SENTENCE_MCQ: sentenceMcqPayloadSchema,
  TEXT_MCQ: textMcqPayloadSchema,
  CLOZE_WORD_BANK: clozeWordBankPayloadSchema,
  PARAGRAPH_MATCH: paragraphMatchPayloadSchema,
  FILL_IN_SENTENCE: fillInBlankPayloadSchema,
  FILL_IN_TEXT: fillInBlankPayloadSchema,
} as const;

export type TaskType = keyof typeof taskTypeSchemas;

export function validateTaskPayload(type: TaskType, payload: unknown) {
  return taskTypeSchemas[type].safeParse(payload);
}

export function pointsForPayload(type: TaskType, payload: unknown): number {
  switch (type) {
    case "SENTENCE_MCQ":
      return 1;
    case "TEXT_MCQ": {
      const p = payload as TextMcqPayload;
      return p.gaps.length;
    }
    case "CLOZE_WORD_BANK": {
      const p = payload as ClozeWordBankPayload;
      return p.gaps.length;
    }
    case "PARAGRAPH_MATCH": {
      const p = payload as ParagraphMatchPayload;
      return p.gaps.length;
    }
    case "FILL_IN_SENTENCE":
    case "FILL_IN_TEXT": {
      const p = payload as FillInBlankPayload;
      return p.gaps.length;
    }
  }
}
