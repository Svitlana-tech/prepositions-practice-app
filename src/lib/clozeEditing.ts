import type { ClozeDisplayMode, ClozeWordBankPayload } from "@/lib/taskSchemas";

/**
 * The teacher writes blanks as "___" (like the sentence-mcq gap marker) instead of
 * typing raw {gapN} tokens. These helpers convert between that editable form and
 * the {gapN}-marked payload the schema and grader expect.
 */

export type EditableCloze = {
  text: string;
  /** One correct answer per "___" occurrence, in the order they appear in `text`. */
  blanks: string[];
  wordBank: string[];
  displayMode: ClozeDisplayMode;
};

export function clozeToPayload(editable: EditableCloze): ClozeWordBankPayload {
  const segments = editable.text.split("___");
  let text = segments[0] ?? "";
  const gaps: ClozeWordBankPayload["gaps"] = [];
  for (let i = 1; i < segments.length; i++) {
    const gapId = `gap${i}`;
    gaps.push({ id: gapId, correctAnswer: editable.blanks[i - 1] ?? "" });
    text += `{${gapId}}${segments[i]}`;
  }
  return { text, gaps, wordBank: editable.wordBank, displayMode: editable.displayMode };
}

export function payloadToEditable(payload: ClozeWordBankPayload): EditableCloze {
  const blanks: string[] = [];
  const text = payload.text.replace(/\{([^}]+)\}/g, (_, gapId: string) => {
    const gap = payload.gaps.find((g) => g.id === gapId);
    blanks.push(gap?.correctAnswer ?? "");
    return "___";
  });
  return { text, blanks, wordBank: payload.wordBank, displayMode: payload.displayMode ?? "dropdown" };
}

export function countBlanks(text: string): number {
  return text.split("___").length - 1;
}
