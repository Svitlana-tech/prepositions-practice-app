/** Longer text gets a smaller starting size so a vocabulary card never has to grow to fit it. */
export function vocabCardFontSize(text: string): string {
  if (text.length > 40) return "clamp(0.85rem, 3vw, 1.15rem)";
  if (text.length > 25) return "clamp(1rem, 3.8vw, 1.4rem)";
  if (text.length > 14) return "clamp(1.15rem, 5vw, 1.9rem)";
  return "clamp(1.5rem, 7vw, 2.75rem)";
}
