/**
 * The fixed inventory for the preposition "cards" picker (FILL_IN_SENTENCE, displayMode
 * "cards"). Mostly simple prepositions, plus a small set of fixed multi-word ones she's
 * explicitly asked to include (e.g. "out of") when a sentence specifically needs one, and
 * "—" for sentences where Russian/Ukrainian uses a preposition but English doesn't.
 * Phrasal verbs add particles ("up", "away", "down", "back", "together") and a few of her deliberate wrong-form traps
 * ("out off", "off of", "out from"), "because", and "than" / "like" ("prefer … than",
 * "regard … like") — all distractors only, never a right answer. "as" is both a
 * distractor and the answer in "regard someone as".
 */
export const PREPOSITIONS = [
  "in", "on", "at", "by", "with", "from", "to", "of", "for", "about",
  "into", "onto", "off", "over", "under", "above", "below", "between",
  "among", "through", "during", "before", "after", "since", "until",
  "against", "without", "within", "along", "across", "behind",
  "beyond", "near", "past", "out of", "out", "around", "up", "away", "down", "back", "together",
  "out off", "off of", "out from", "as", "because", "than", "like", "—",
] as const;

/** True when the gap opens a sentence: nothing before it, or the text before it ends a
 *  sentence ("…today. {gap} …"). */
export function gapStartsSentence(before: string): boolean {
  const t = before.trimEnd();
  return t === "" || /[.!?]["'’”)]?$/.test(t);
}

/** The word as it reads in the sentence: "in" → "In" when the gap opens the sentence.
 *  Stored answers stay lower-case; this is display only. */
export function capitalizeForGap(word: string, before: string): string {
  return gapStartsSentence(before) ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}
