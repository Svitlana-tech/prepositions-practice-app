export type CategoryTheme = { bg: string; accent: string; icon: string };

/** Palette from the design spec, one soft-background/accent pair per topic card. */
const PALETTE: CategoryTheme[] = [
  { bg: "#E8F5E9", accent: "#2E7D32", icon: "📘" }, // green
  { bg: "#FFF3E0", accent: "#E65100", icon: "💼" }, // orange
  { bg: "#E3F2FD", accent: "#1565C0", icon: "🧭" }, // blue
  { bg: "#F3E5F5", accent: "#7B1FA2", icon: "📕" }, // purple
  { bg: "#FCE4EC", accent: "#AD1457", icon: "🧩" }, // pink
  { bg: "#FFF8E1", accent: "#F57F17", icon: "🔗" }, // amber
];

/** Known category names get a deliberately chosen color; anything else falls
 * back to a stable pick from the same palette so new categories still look
 * intentional instead of breaking the grid. */
const NAMED: Record<string, CategoryTheme> = {
  "Dependent": PALETTE[0],
  "Academic Writing": PALETTE[1],
  "Essential": PALETTE[2],
  "Phrasal Verbs": PALETTE[3],
  "Prepositions": PALETTE[4],
  "Fixed Expressions": PALETTE[5],
};

export function getCategoryTheme(name: string): CategoryTheme {
  if (NAMED[name]) return NAMED[name];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/** The "practice everything at once" banner — matches the spec's
 * "Daily Mix" banner (dark card, teal accent). */
export const MIX_THEME = { bg: "#2B2D42", text: "#FFFFFF", accent: "#2A9D8F" };

/** The "Fix Mistakes" button — the student's own wrong answers, red-tinted. */
export const FIX_MISTAKES_THEME: CategoryTheme = { bg: "#FFEBEE", accent: "#C62828", icon: "🛠️" };
