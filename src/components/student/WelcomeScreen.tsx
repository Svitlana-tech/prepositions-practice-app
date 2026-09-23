"use client";

const FEATURES = [
  {
    icon: "🎯",
    iconBg: "#E8F5E9",
    iconColor: "#2E7D32",
    title: "Choose a Topic",
    subtitle: "Practice Verbs, Adjectives, Expressions, or Phrasal Verbs.",
  },
  {
    icon: "⏱️",
    iconBg: "#FFF3E0",
    iconColor: "#E65100",
    title: "Quick 2-Minute Bites",
    subtitle: "10-card sessions designed to fit seamlessly into your day.",
  },
  {
    icon: "💡",
    iconBg: "#E3F2FD",
    iconColor: "#1565C0",
    title: "Learn Rules on the Fly",
    subtitle: "Clear patterns, explanations, and real-life examples for every card.",
  },
];

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-6 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold" style={{ color: "#2B2D42" }}>
          Preposition Master
        </h1>
        <p className="mt-2 text-base" style={{ color: "#6C757D" }}>
          Master English prepositions in 2 minutes a day.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="flex items-start gap-4 rounded-2xl bg-white p-4"
            style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl"
              style={{ background: f.iconBg, color: f.iconColor }}
            >
              {f.icon}
            </div>
            <div>
              <div className="font-semibold" style={{ color: "#2B2D42" }}>
                {f.title}
              </div>
              <div className="text-sm" style={{ color: "#6C757D" }}>
                {f.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="w-full py-3.5 text-base font-bold"
        style={{ background: "#2A9D8F", color: "#FFFFFF", borderRadius: "14px" }}
      >
        Start Practice
      </button>
    </div>
  );
}
