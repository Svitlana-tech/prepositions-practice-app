import type { TextMcqPayload } from "@/lib/taskSchemas";

/**
 * The teacher writes gaps as "___" in the text instead of typing raw {gapN} tokens.
 * These helpers convert between that editable form and the {gapN}-marked payload
 * the schema and grader expect. Mirrors clozeEditing.ts, but each gap here carries
 * its own 4 options instead of sharing one word bank.
 */

export type EditableGap = { options: string[]; correctIndex: number | null };

export type EditableTextMcq = {
  text: string;
  /** One entry per "___" occurrence, in the order they appear in `text`. */
  gaps: EditableGap[];
};

export function textMcqToPayload(editable: EditableTextMcq): TextMcqPayload {
  const segments = editable.text.split("___");
  let text = segments[0] ?? "";
  const gaps: TextMcqPayload["gaps"] = [];
  for (let i = 1; i < segments.length; i++) {
    const gapId = `gap${i}`;
    const gap = editable.gaps[i - 1];
    gaps.push({
      id: gapId,
      options: gap?.options ?? ["", "", "", ""],
      correctIndex: gap?.correctIndex ?? 0,
    });
    text += `{${gapId}}${segments[i]}`;
  }
  return { text, gaps };
}

export function payloadToEditableTextMcq(payload: TextMcqPayload): EditableTextMcq {
  const gaps: EditableGap[] = [];
  const text = payload.text.replace(/\{([^}]+)\}/g, (_, gapId: string) => {
    const gap = payload.gaps.find((g) => g.id === gapId);
    gaps.push({ options: gap?.options ?? ["", "", "", ""], correctIndex: gap?.correctIndex ?? null });
    return "___";
  });
  return { text, gaps };
}

export function countGaps(text: string): number {
  return text.split("___").length - 1;
}
