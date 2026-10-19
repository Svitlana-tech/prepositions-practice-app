"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { capitalizeForGap } from "@/lib/prepositions";
import { getLevel } from "@/lib/levels";
import { recordFinishedSession, recordSessionTime, type SessionProgress, type TimeResult } from "@/lib/progress";
import { shouldOfferCode } from "@/lib/progressSync";
import { CodeOffer } from "@/components/student/SecretCode";

/** One answered question of the session, as the results screen needs it. */
export type AnswerRecord = {
  taskId: string;
  /** The sentence with its `{gap1}` placeholder. */
  text: string;
  chosen: string;
  correctAnswer: string;
  correct: boolean;
};

const INK = "#2B2B2B";
const MUTED = "#6B7280";
/** Same colours as the test's progress bar and the menu. */
const RIGHT = "#22C55E";
const WRONG = "#EF4444";
const BLUE = { bg: "#E3F2FD", accent: "#1565C0" };
const SAND = { bg: "#FDF6EC", accent: "#B45309" };
/** The record card wears Daily Mix's amber. */
const AMBER = { bg: "#FEF3C7", accent: "#B45309" };
/** The recap sentences look like the examples in explanations (blue, hand-printed); the
 *  right preposition in them is a calm dark green that stands apart from the blue. */
const EXAMPLE_BLUE = "#1E4FA8";
const ANSWER_GREEN = "#15803D";

function verdict(score: number, total: number): string {
  const ratio = total > 0 ? score / total : 0;
  if (ratio === 1) return "Perfect session! 🎯";
  if (ratio >= 0.8) return "Great job! 👍";
  if (ratio >= 0.5) return "Keep practising! 💡";
  return "Time for a review! 🔄";
}

/** The sentence written out with the right answer in its gap, split around the answer so
 *  it can be highlighted. "—" (no preposition needed) just closes the gap. */
function fullSentence(text: string, answer: string): { before: string; answer: string; after: string } {
  const [before = "", after = ""] = text.split(/\{[^}]+\}/);
  if (answer === "—") {
    const rest = after.trimStart();
    return { before: `${before.trimEnd()} ${capitalizeForGap(rest, before)}`.trimStart(), answer: "", after: "" };
  }
  return { before, answer: capitalizeForGap(answer, before), after };
}

/** 38 → "38 sec", 75 → "1 min 15 sec". */
function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const min = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest === 0 ? `${min} min` : `${min} min ${rest} sec`;
}

/** The end-of-session screen: result, rewards, the sentences to remember, what next. */
export function SessionResults({
  records,
  onRepeat,
  timing = null,
}: {
  records: AnswerRecord[];
  onRepeat: () => void;
  /** For "beat yourself" time records; null where records don't apply (Fix Mistakes). */
  timing?: { recordKey: string; thinkingMs: number } | null;
}) {
  const score = records.filter((r) => r.correct).length;
  const total = records.length;
  const mistakes = records.filter((r) => !r.correct);

  // Streak/points must be counted exactly once per finished session — the ref guards
  // against the effect re-running (e.g. React's dev-mode double invoke).
  const recorded = useRef(false);
  const [progress, setProgress] = useState<SessionProgress | null>(null);
  const [time, setTime] = useState<TimeResult | null>(null);
  const [offerCode, setOfferCode] = useState(false);
  const before = progress ? getLevel(progress.totalPoints - progress.pointsEarned) : null;
  const after = progress ? getLevel(progress.totalPoints) : null;
  const newLevel = before && after && after.index > before.index ? after.name : null;
  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    const finished = recordFinishedSession(
      records.map((r) => r.taskId),
      score
    );
    setProgress(finished);
    setOfferCode(finished.totalPoints > 0 && shouldOfferCode());
    // Anonymous +1 for the teacher's Usage page; a failure here never bothers the student.
    fetch("/api/stats/test-finished", { method: "POST" }).catch(() => {});
    // A time only counts when every answer was right.
    if (timing && total > 0 && score === total) {
      setTime(recordSessionTime(timing.recordKey, total, timing.thinkingMs));
    }
  }, [records, score, total, timing]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
      {/* 1. The test's own progress bar, big: which questions went well */}
      <div className="flex gap-[5px]" aria-hidden="true">
        {records.map((r) => (
          <div
            key={r.taskId}
            className="h-3 flex-1 rounded-full"
            style={{ background: r.correct ? RIGHT : WRONG }}
          />
        ))}
      </div>

      {/* 2. Result */}
      <div className="text-center">
        <div className="text-5xl leading-none font-bold" style={{ color: INK }}>
          {score} <span className="text-2xl" style={{ color: MUTED }}>/ {total}</span>
        </div>
        <h2 className="mt-2 text-2xl font-bold" style={{ color: INK }}>
          {verdict(score, total)}
        </h2>
      </div>

      {/* 3. Rewards */}
      {progress && (
        <div className="flex flex-wrap justify-center gap-2">
          {progress.firstToday && (
            <span
              className="rounded-full bg-white px-4 py-2 text-sm font-bold"
              style={{ color: INK, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
            >
              🔥 {progress.streakDays} {progress.streakDays === 1 ? "day" : "days in a row"}
            </span>
          )}
          <span
            className="rounded-full bg-white px-4 py-2 text-sm font-bold"
            style={{ color: INK, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          >
            ⭐ +{progress.pointsEarned} pts
          </span>
        </div>
      )}

      {/* 3a. A new title earned with this session's points */}
      {newLevel && (
        <div
          className="record-pop rounded-[14px] px-4 py-3 text-center"
          style={{ background: BLUE.bg, color: BLUE.accent }}
        >
          <div className="text-sm font-bold">🎉 New title!</div>
          <div className="text-2xl font-bold">🧭 {newLevel}</div>
        </div>
      )}

      {/* 3b. Beat yourself: the time of a flawless session against the best one so far */}
      {time && (
        <div
          className={`rounded-[14px] px-4 py-3 text-center ${time.isNewRecord ? "record-pop" : ""}`}
          style={{ background: AMBER.bg, color: AMBER.accent }}
        >
          {time.isNewRecord ? (
            <>
              <div className="text-lg font-bold">
                🏆 {time.previousBest === null ? "Your first record!" : "New record!"}
              </div>
              <div className="text-sm font-bold">
                {total} sentences in {formatSeconds(time.seconds)}
                {time.previousBest !== null && <> · was {formatSeconds(time.previousBest)}</>}
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-bold">
                ⏱ {total} sentences in {formatSeconds(time.seconds)}
              </div>
              <div className="text-sm font-bold">
                {time.seconds === time.previousBest
                  ? "Same as your record!"
                  : `Your record: ${formatSeconds(time.previousBest ?? 0)}`}
              </div>
            </>
          )}
        </div>
      )}

      {/* 3c. No secret code yet: offer one to keep the points (her pick "2B") */}
      {offerCode && progress && <CodeOffer totalPoints={progress.totalPoints} />}

      {/* 4. The sentences to remember, set a little apart from the result above, each
          written out in full with the right preposition in green. */}
      {mistakes.length > 0 ? (
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold tracking-wider uppercase" style={{ color: MUTED }}>
            {mistakes.length === 1 ? "Remember this" : "Remember these"}
          </p>
          <div className="flex flex-col gap-2">
            {mistakes.map((m) => {
              const s = fullSentence(m.text, m.correctAnswer);
              return (
                <p
                  key={m.taskId}
                  className="rounded-[14px] px-3 py-2.5 text-[17px] leading-snug"
                  style={{
                    background: SAND.bg,
                    color: EXAMPLE_BLUE,
                    fontFamily: 'var(--font-handwriting), "Segoe Print", "Comic Sans MS", cursive',
                  }}
                >
                  {s.before}
                  {s.answer && (
                    <b className="font-bold" style={{ color: ANSWER_GREEN }}>
                      {s.answer}
                    </b>
                  )}
                  {s.after}
                </p>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          className="mt-6 rounded-[14px] p-4 text-center text-sm font-bold"
          style={{ background: "#E8F5E9", color: "#2E7D32" }}
        >
          🟢 Zero mistakes! Added to mastered cards.
        </div>
      )}

      {/* 5. Actions */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onRepeat}
          className="rounded-2xl py-2.5 text-lg font-bold transition-transform active:scale-[0.98]"
          style={{ background: BLUE.bg, color: BLUE.accent, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
        >
          🔄 Try again
        </button>
        <Link
          href="/tasks"
          className="rounded-2xl py-2.5 text-center text-lg font-bold transition-transform active:scale-[0.98]"
          style={{ background: SAND.bg, color: SAND.accent, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
        >
          🏠 Back to menu
        </Link>
      </div>
    </div>
  );
}
