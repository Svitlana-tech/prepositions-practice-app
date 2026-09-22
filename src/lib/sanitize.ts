import type {
  ClozeWordBankPayload,
  FillInBlankPayload,
  ParagraphMatchPayload,
  SentenceMcqPayload,
  TaskType,
  TextMcqPayload,
} from "./taskSchemas";

/**
 * Strips correct-answer fields before a task payload is sent to a student's
 * browser. Grading always happens server-side in /api/attempts, so the
 * client must never receive the answer key.
 */
export function sanitizePayloadForStudent(type: TaskType, payload: unknown): unknown {
  switch (type) {
    case "SENTENCE_MCQ": {
      const p = payload as SentenceMcqPayload;
      return { sentence: p.sentence, options: p.options };
    }
    case "TEXT_MCQ": {
      const p = payload as TextMcqPayload;
      return {
        text: p.text,
        gaps: p.gaps.map((g) => ({ id: g.id, options: g.options })),
      };
    }
    case "CLOZE_WORD_BANK": {
      const p = payload as ClozeWordBankPayload;
      return {
        text: p.text,
        gaps: p.gaps.map((g) => ({ id: g.id })),
        wordBank: p.wordBank,
        displayMode: p.displayMode ?? "dropdown",
      };
    }
    case "PARAGRAPH_MATCH": {
      const p = payload as ParagraphMatchPayload;
      return {
        textWithGaps: p.textWithGaps,
        gaps: p.gaps.map((g) => ({ id: g.id })),
        paragraphs: p.paragraphs,
      };
    }
    case "FILL_IN_SENTENCE":
    case "FILL_IN_TEXT": {
      const p = payload as FillInBlankPayload;
      return {
        text: p.text,
        gaps: p.gaps.map((g) => ({ id: g.id })),
        displayMode: p.displayMode ?? "type",
        ...(p.options ? { options: p.options } : {}),
      };
    }
  }
}
