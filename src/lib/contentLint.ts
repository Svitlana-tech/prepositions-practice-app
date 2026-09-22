import type { TaskType } from "./taskSchemas";

/**
 * Non-blocking content sanity checks, run after schema validation on every task
 * save. These catch the mechanical bug patterns found during manual review
 * sessions (missing quote marks, copy-pasted duplicate options, a gap answer
 * that repeats a word already supplied by a contraction next to the gap) —
 * never semantic/grammar correctness, which still needs a human or an AI read.
 * Returned warnings are advisory: the caller still saves the task either way.
 */

const CONTRACTION_SUBJECT: Record<string, string> = {
  "i'm": "i",
  "i've": "i",
  "i'll": "i",
  "i'd": "i",
  "he's": "he",
  "he'll": "he",
  "he'd": "he",
  "she's": "she",
  "she'll": "she",
  "she'd": "she",
  "it's": "it",
  "it'll": "it",
  "it'd": "it",
  "we're": "we",
  "we've": "we",
  "we'll": "we",
  "we'd": "we",
  "they're": "they",
  "they've": "they",
  "they'll": "they",
  "they'd": "they",
  "you're": "you",
  "you've": "you",
  "you'll": "you",
  "you'd": "you",
  "who's": "who",
  "that's": "that",
  "there's": "there",
};

function stripPunctuation(word: string): string {
  return word.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "");
}

function lastWord(text: string): string | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const w = stripPunctuation(words[words.length - 1]);
  return w || null;
}

function firstWord(text: string): string | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const w = stripPunctuation(words[0]);
  return w || null;
}

/** The subject a word "is", either literally or embedded in a contraction (he's -> he). */
function impliedSubject(word: string): string {
  const lower = word.toLowerCase();
  return CONTRACTION_SUBJECT[lower] ?? lower;
}

function wordsCollide(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  if (la === lb) return true;
  return impliedSubject(la) === impliedSubject(lb);
}

function checkQuoteBalance(warnings: string[], label: string, text: string) {
  const count = (text.match(/"/g) ?? []).length;
  if (count % 2 !== 0) {
    warnings.push(`${label} has an odd number of " marks — a quotation mark might be missing.`);
  }
}

function checkOptionDuplicates(warnings: string[], label: string, options: string[]) {
  const seen = new Map<string, number>();
  options.forEach((opt, idx) => {
    const key = opt.trim().toLowerCase();
    if (!key) return;
    const firstIdx = seen.get(key);
    if (firstIdx !== undefined) {
      warnings.push(
        `${label}: option ${firstIdx + 1} and option ${idx + 1} are the same text ("${opt.trim()}").`
      );
    } else {
      seen.set(key, idx);
    }
  });
}

/** Flags a word right before/after the gap that would duplicate the start/end of the correct answer once substituted in. */
function checkGapBoundary(warnings: string[], label: string, before: string, after: string, answer: string) {
  if (!answer.trim()) return;
  const wBefore = lastWord(before);
  const wAfter = firstWord(after);
  const aFirst = firstWord(answer);
  const aLast = lastWord(answer);
  if (wordsCollide(wBefore, aFirst)) {
    warnings.push(
      `${label}: the word right before the gap ("${wBefore}") and the start of the correct answer ("${answer.trim()}") look like they'd duplicate once the gap is filled in.`
    );
  }
  if (wordsCollide(aLast, wAfter)) {
    warnings.push(
      `${label}: the end of the correct answer ("${answer.trim()}") and the word right after the gap ("${wAfter}") look like they'd duplicate once the gap is filled in.`
    );
  }
}

type McqGap = { id: string; options: string[]; correctIndex: number };
type FillGap = { id: string; correctAnswer: string };

export function lintTaskContent(type: TaskType, payload: unknown, title: string): string[] {
  const warnings: string[] = [];
  const p = (payload ?? {}) as Record<string, unknown>;

  checkQuoteBalance(warnings, "Title", title);

  switch (type) {
    case "SENTENCE_MCQ": {
      const sentence = String(p.sentence ?? "");
      const options = (p.options as string[] | undefined) ?? [];
      const correctIndex = p.correctIndex as number;
      checkQuoteBalance(warnings, "Sentence", sentence);
      checkOptionDuplicates(warnings, "Options", options);
      const gapIdx = sentence.indexOf("___");
      if (gapIdx >= 0 && options[correctIndex] != null) {
        checkGapBoundary(
          warnings,
          "Sentence",
          sentence.slice(0, gapIdx),
          sentence.slice(gapIdx + 3),
          options[correctIndex]
        );
      }
      break;
    }
    case "TEXT_MCQ": {
      const text = String(p.text ?? "");
      checkQuoteBalance(warnings, "Text", text);
      const gaps = (p.gaps as McqGap[] | undefined) ?? [];
      for (const gap of gaps) {
        checkOptionDuplicates(warnings, `Gap {${gap.id}} options`, gap.options);
        const marker = `{${gap.id}}`;
        const markerIdx = text.indexOf(marker);
        const answer = gap.options[gap.correctIndex];
        if (markerIdx >= 0 && answer != null) {
          checkGapBoundary(
            warnings,
            `Gap {${gap.id}}`,
            text.slice(0, markerIdx),
            text.slice(markerIdx + marker.length),
            answer
          );
        }
      }
      break;
    }
    case "CLOZE_WORD_BANK": {
      const text = String(p.text ?? "");
      checkQuoteBalance(warnings, "Text", text);
      const gaps = (p.gaps as FillGap[] | undefined) ?? [];
      const wordBank = (p.wordBank as string[] | undefined) ?? [];
      checkOptionDuplicates(warnings, "Word bank", wordBank);
      for (const gap of gaps) {
        const marker = `{${gap.id}}`;
        const markerIdx = text.indexOf(marker);
        if (markerIdx >= 0) {
          checkGapBoundary(
            warnings,
            `Gap {${gap.id}}`,
            text.slice(0, markerIdx),
            text.slice(markerIdx + marker.length),
            gap.correctAnswer
          );
        }
      }
      break;
    }
    case "FILL_IN_SENTENCE":
    case "FILL_IN_TEXT": {
      const text = String(p.text ?? "");
      checkQuoteBalance(warnings, "Text", text);
      const gaps = (p.gaps as FillGap[] | undefined) ?? [];
      for (const gap of gaps) {
        const marker = `{${gap.id}}`;
        const markerIdx = text.indexOf(marker);
        if (markerIdx >= 0) {
          checkGapBoundary(
            warnings,
            `Gap {${gap.id}}`,
            text.slice(0, markerIdx),
            text.slice(markerIdx + marker.length),
            gap.correctAnswer
          );
        }
      }
      break;
    }
    case "PARAGRAPH_MATCH":
      break;
  }

  return warnings;
}
