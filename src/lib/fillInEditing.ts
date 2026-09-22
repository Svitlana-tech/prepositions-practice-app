import type { FillInBlankPayload, FillInDisplayMode } from "@/lib/taskSchemas";

/**
 * The teacher writes blanks as "___" in the text instead of typing raw {gapN} tokens.
 * These helpers convert between that editable form and the {gapN}-marked payload the
 * schema and grader expect. Mirrors clozeEditing.ts, but there's no word bank — the
 * student types the answer freely, or (displayMode "cards") taps a curated preposition
 * card grid.
 */

export type EditableFillIn = {
  text: string;
  /** One correct answer per "___" occurrence, in the order they appear in `text`. */
  blanks: string[];
  displayMode: FillInDisplayMode;
  /** Cards mode only: the curated tappable option set. */
  options?: string[];
};

export function fillInToPayload(editable: EditableFillIn): FillInBlankPayload {
  const segments = editable.text.split("___");
  let text = segments[0] ?? "";
  const gaps: FillInBlankPayload["gaps"] = [];
  for (let i = 1; i < segments.length; i++) {
    const gapId = `gap${i}`;
    gaps.push({ id: gapId, correctAnswer: editable.blanks[i - 1] ?? "" });
    text += `{${gapId}}${segments[i]}`;
  }
  return {
    text,
    gaps,
    displayMode: editable.displayMode,
    ...(editable.displayMode === "cards" ? { options: editable.options ?? [] } : {}),
  };
}

export function payloadToEditableFillIn(payload: FillInBlankPayload): EditableFillIn {
  const blanks: string[] = [];
  const text = payload.text.replace(/\{([^}]+)\}/g, (_, gapId: string) => {
    const gap = payload.gaps.find((g) => g.id === gapId);
    blanks.push(gap?.correctAnswer ?? "");
    return "___";
  });
  return { text, blanks, displayMode: payload.displayMode ?? "type", options: payload.options };
}

export function countBlanks(text: string): number {
  return text.split("___").length - 1;
}
