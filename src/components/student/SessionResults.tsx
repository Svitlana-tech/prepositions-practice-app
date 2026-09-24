"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { recordFinishedSession, type SessionProgress } from "@/lib/progress";

/** One answered question of the session, as the results screen needs it. */
export type AnswerRecord = {
  taskId: string;
  /** The sentence with its `{gap1}` placeholder. */
  text: string;
  chosen: string;
  correctAnswer: string;
  correct: boolean;
};

const INK = "#2B2D42";
const MUTED = "#6C757D";
const EMERALD = "#2A9D8F";

function verdict(score: number, total: number): string {
  const ratio = total > 0 ? score / total : 0;
  if (ratio === 1) return "Perfect Session! 🎯";
  if (ratio >= 0.8) return "Great Job! 👍";
  if (ratio >= 0.5) return "Keep Practicing! 💡";
  return "Need a Review! 🔄";
}

/** Strips quotes/punctuation hugging a word, keeping inner apostrophes and hyphens. */
function cleanWord(word: string | undefined): string {
  return (word ?? "").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

/**
 * The gap's word with its neighbours — "depend on the", "burst into tears" — short
 * enough for a one-line recap but with enough context to recognise the sentence.
 * "—" (no preposition needed) just leaves the neighbours together.
 */
function phrase(text: string, word: string): string {
  const [before = "", after = ""] = text.split(/\{[^}]+\}/);
  const prev = cleanWord(before.trim().split(/\s+/).pop());
  const next = cleanWord(after.trim().split(/\s+/)[0]);
  return [prev, word === "—" ? "" : word, next].filter(Boolean).join(" ");
}

/** The end-of-session screen: result, rewards, mistake recap, and what to do next. */
export function SessionResults({ records, onRepeat }: { records: AnswerRecord[]; onRepeat: () => void }) {
  const score = records.filter((r) => r.correct).length;
  const total = records.length;
  const mistakes = records.filter((r) => !r.correct);

  // Streak/points must be counted exactly once per finished session — the ref guards
  // against the effect re-running (e.g. React's dev-mode double invoke).
  const recorded = useRef(false);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    setProgress(
      recordFinishedSession(
        records.map((r) => r.taskId),
        score
      )
    );
  }, [records, score]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      {/* 1. Result */}
      <div className="text-center">
        <h2 className="text-2xl font-bold" style={{ color: INK }}>
          {verdict(score, total)}
        </h2>
        <div className="mt-1 text-4xl font-bold" style={{ color: EMERALD }}>
          {score} / {total}
        </div>
      </div>

      {/* 2. Rewards */}
      {progress && (
        <div className="flex flex-wrap justify-center gap-2">
          {progress.firstToday && (
            <span
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold"
              style={{ color: INK, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
            >
              🔥 Streak: {progress.streakDays} {progress.streakDays === 1 ? "Day" : "Days"}
            </span>
          )}
          <span
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold"
            style={{ color: INK, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
          >
            ⭐ Points: +{progress.pointsEarned} pts
          </span>
        </div>
      )}

      {/* 3. Mistake recap */}
      {mistakes.length > 0 ? (
        <div
          className="flex max-h-72 flex-col gap-2 overflow-y-auto rounded-2xl bg-white p-4"
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
        >
          {mistakes.map((m) => (
            <div key={m.taskId} className="text-sm" style={{ color: INK }}>
              ❌ <span className="line-through" style={{ color: MUTED }}>{phrase(m.text, m.chosen)}</span>
              {" → "}✅ <span className="font-semibold">{phrase(m.text, m.correctAnswer)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl p-4 text-center text-sm font-semibold" style={{ background: "#E8F5E9", color: "#2E7D32" }}>
          🟢 Zero mistakes! Added to mastered cards.
        </div>
      )}

      {/* 4. Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRepeat}
          className="flex-1 border-2 bg-white py-3 text-base font-bold"
          style={{ borderColor: EMERALD, color: EMERALD, borderRadius: "14px" }}
        >
          🔄 Repeat Topic
        </button>
        <Link
          href="/tasks"
          className="flex-1 py-3 text-center text-base font-bold"
          style={{ background: EMERALD, color: "#FFFFFF", borderRadius: "14px" }}
        >
          🏠 Home
        </Link>
      </div>
    </div>
  );
}
