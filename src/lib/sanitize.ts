import type { FillInBlankPayload, TaskType } from "./taskSchemas";

/**
 * Strips correct-answer fields before a task payload is sent to a student's
 * browser. Grading always happens server-side in /api/attempts, so the
 * client must never receive the answer key.
 */
export function sanitizePayloadForStudent(type: TaskType, payload: unknown): unknown {
  switch (type) {
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
