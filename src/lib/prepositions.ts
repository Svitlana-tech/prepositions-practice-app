/**
 * The fixed inventory for the preposition "cards" picker (FILL_IN_SENTENCE, displayMode
 * "cards"). Mostly simple prepositions, plus a small set of fixed multi-word ones she's
 * explicitly asked to include (e.g. "out of") when a sentence specifically needs one, and
 * "—" for sentences where Russian/Ukrainian uses a preposition but English doesn't.
 */
export const PREPOSITIONS = [
  "in", "on", "at", "by", "with", "from", "to", "of", "for", "about",
  "into", "onto", "off", "over", "under", "above", "below", "between",
  "among", "through", "during", "before", "after", "since", "until",
  "against", "without", "within", "along", "across", "behind",
  "beyond", "near", "past", "out of", "out", "around", "—",
] as const;
