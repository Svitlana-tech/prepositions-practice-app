"use client";

import { WelcomeHero } from "@/components/student/WelcomeHero";

// Same look as the menu rows: blue, amber (like Daily Mix), sand.
const FEATURES = [
  { icon: "👆", bg: "#E3F2FD", title: "Tap the right card", subtitle: "Fill the gap in the sentence" },
  { icon: "⚡", bg: "#FEF3C7", title: "10 cards at a time", subtitle: "A quick round, then your score" },
  { icon: "💡", bg: "#F8ECDA", title: "See why", subtitle: "A short rule and an example" },
];

/** First launch only: what the app is, then on to the name screen. */
export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-sm flex-col justify-between gap-6 px-5 pb-8">
      <WelcomeHero subtitle="Prepositions in 2 minutes a day" />

      <div className="flex flex-col gap-2.5">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="menu-enter flex items-center gap-3 rounded-2xl px-3 py-3"
            style={{ background: f.bg, ["--i" as string]: i + 1 }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-lg">
              {f.icon}
            </div>
            <div>
              <div className="text-[15px] font-bold" style={{ color: "#2B2D42" }}>
                {f.title}
              </div>
              <div className="text-[13px]" style={{ color: "#6C757D" }}>
                {f.subtitle}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onStart}
        className="menu-enter w-full py-3.5 text-base font-bold transition-transform active:scale-[0.97]"
        style={{ background: "#1565C0", color: "#FFFFFF", borderRadius: "14px", ["--i" as string]: 4 }}
      >
        Let&apos;s start
      </button>
    </div>
  );
}
