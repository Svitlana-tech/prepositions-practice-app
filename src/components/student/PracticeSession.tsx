"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getCategoryTheme } from "@/lib/categoryTheme";
import type { TaskType } from "@/lib/taskSchemas";
import { getMistakeIds, recordFirstTry, removeMistake } from "@/lib/mistakes";
import { forgetSeen, getSeenIds, markSeen } from "@/lib/seenTasks";
import { SessionResults, type AnswerRecord } from "@/components/student/SessionResults";
import {
  FillInBlankQuestion,
  type QuestionPayload as Payload,
  type CheckResult,
  type CurrentAnswers,
} from "@/components/student/QuestionRenderers";

// The after-Check buttons borrow the topic menu's colors: Explanation looks like the
// Dependent tile (green), Next like the Phrasal Verbs tile (painted in Essential's blue).
const EXPLANATION_THEME = getCategoryTheme("Dependent");
const NEXT_THEME = getCategoryTheme("Essential");

export function PracticeSession({
  taskType = null,
  categoryId = null,
  sectionId = null,
  presetTaskIds = null,
  onRepeat,
}: {
  taskType?: TaskType | null;
  /** A single topic of that type, or null for "all topics of this type mixed". */
  categoryId?: string | null;
  /** The section this session was started from — keeps "mixed" (no categoryId) scoped
   *  to that section's topics instead of every topic of the type app-wide. */
  sectionId?: string | null;
  /** Play exactly these tasks instead of asking practice/start for a random 10
   *  (the Fix Mistakes session). */
  presetTaskIds?: string[] | null;
  /** "Repeat Topic" on the results screen — the page remounts a fresh session. */
  onRepeat: () => void;
}) {
  const [taskIds, setTaskIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<CurrentAnswers>({});
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [finished, setFinished] = useState(false);
  const nextRef = useRef<HTMLDivElement>(null);
  // The session's changes to the "seen" list, held back until the set is finished: a
  // session abandoned halfway (window closed, Back pressed) leaves the list untouched, so
  // its sentences go back into the pool. `lastOfCycle` tasks close a topic's previous
  // cycle — answered, but not counted as seen in the new one.
  const pendingSeenRef = useRef<{ forget: string[]; lastOfCycle: Set<string>; committed: boolean }>({
    forget: [],
    lastOfCycle: new Set(),
    committed: false,
  });

  useEffect(() => {
    if (presetTaskIds) {
      setTaskIds(presetTaskIds);
      return;
    }
    fetch("/api/practice/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The mix (no topic) mixes in a couple of this student's own mistakes.
      body: JSON.stringify({
        taskType,
        categoryId,
        sectionId,
        mistakeTaskIds: categoryId ? [] : getMistakeIds(),
        seenTaskIds: getSeenIds(),
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Could not start the practice session.");
        }
        return res.json();
      })
      .then((data) => {
        pendingSeenRef.current.forget = data.forgetSeenIds ?? [];
        pendingSeenRef.current.lastOfCycle = new Set(data.lastOfCycleIds ?? []);
        setTaskIds(data.taskIds);
      })
      .catch((e) => setError(e.message));
  }, [taskType, categoryId, sectionId, presetTaskIds]);

  useEffect(() => {
    if (!taskIds || index >= taskIds.length) return;
    setPayload(null);
    setInstructions(null);
    setCurrentAnswers({});
    setCheckResult(null);
    setShowExplanation(false);
    const taskId = taskIds[index];
    fetch(`/api/tasks/${taskId}`)
      .then(async (res) => {
        if (res.status === 404) {
          // Deleted/unpublished since it was saved as a mistake — drop it and move on.
          removeMistake(taskId);
          setTaskIds((ids) => ids?.filter((id) => id !== taskId) ?? null);
          return;
        }
        const data = await res.json();
        setPayload(data.payload);
        setInstructions(data.instructions ?? null);
      });
  }, [taskIds, index]);

  // Only reachable when dropped tasks (above) shrink the list past the current position.
  useEffect(() => {
    if (!taskIds || index < taskIds.length) return;
    if (taskIds.length === 0) setError("There are no questions here yet.");
    else setFinished(true);
  }, [taskIds, index]);

  // The set was completed — only now do its sentences count as done for this cycle.
  useEffect(() => {
    const pending = pendingSeenRef.current;
    if (!finished || pending.committed) return;
    pending.committed = true;
    forgetSeen(pending.forget);
    for (const r of records) {
      if (!pending.lastOfCycle.has(r.taskId)) markSeen(r.taskId);
    }
  }, [finished, records]);

  // After Check, scroll the Next button into view with room to spare below it (its
  // scroll-mb) — at the very bottom it can end up under a phone browser's floating
  // toolbar (e.g. Telegram's in-app browser).
  useEffect(() => {
    if (!checkResult) return;
    // Next frame: the layout is still settling (Check button swapped for the feedback)
    // and a scroll started mid-change gets dropped.
    const frame = requestAnimationFrame(() =>
      nextRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
    );
    return () => cancelAnimationFrame(frame);
  }, [checkResult]);

  const allGapsFilled =
    payload !== null &&
    payload.gaps.every((g) => currentAnswers[g.id] !== undefined && currentAnswers[g.id] !== "");

  async function handleCheck() {
    if (!taskIds || !allGapsFilled) return;
    const taskId = taskIds[index];
    const res = await fetch("/api/practice/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, answers: currentAnswers }),
    });
    const result: CheckResult = await res.json();
    const correct = result.score === result.maxScore;
    setCheckResult(result);
    recordFirstTry(taskId, correct);
    if (correct) setCorrectCount((c) => c + 1);
    if (payload) {
      const gapId = payload.gaps[0]?.id ?? "gap1";
      setRecords((prev) => [
        ...prev,
        {
          taskId,
          text: payload.text,
          chosen: String(currentAnswers[gapId] ?? ""),
          correctAnswer: result.reveal?.correctAnswers?.[gapId] ?? "",
          correct,
        },
      ]);
    }
  }

  function handleNext() {
    if (!taskIds) return;
    if (index + 1 < taskIds.length) {
      setIndex(index + 1);
      return;
    }
    setFinished(true);
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-red-600">{error}</p>
        <Link href="/tasks" className="text-blue-600 hover:underline">
          ← Choose another exercise
        </Link>
      </div>
    );
  }

  if (finished) {
    return <SessionResults records={records} onRepeat={onRepeat} />;
  }

  if (!taskIds || !payload) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-sm text-gray-500">
        Question {index + 1} of {taskIds.length} · correct: {correctCount}
      </div>

      <FillInBlankQuestion
        payload={payload}
        answers={currentAnswers}
        onChange={(gapId, value) => setCurrentAnswers((prev) => ({ ...prev, [gapId]: value }))}
        checkResult={checkResult}
        instructions={instructions}
        showExplanation={showExplanation}
      />

      {!checkResult && (
        <Button onClick={handleCheck} disabled={!allGapsFilled}>
          Check
        </Button>
      )}

      {/* Right or wrong, the answer shows in the sentence itself; the explanation opens
          only on request, and Next skips straight to the following question. */}
      {checkResult && (
        <div ref={nextRef} className="flex scroll-mb-32 flex-col gap-3">
          {checkResult.explanation && (
            <SlimButton theme={EXPLANATION_THEME} onClick={() => setShowExplanation((open) => !open)}>
              {showExplanation ? "Hide explanation" : "Explanation"}
            </SlimButton>
          )}
          <SlimButton theme={NEXT_THEME} onClick={handleNext}>
            {index + 1 < taskIds.length ? "Next →" : "Finish"}
          </SlimButton>
        </div>
      )}
    </div>
  );
}

function SlimButton({
  theme,
  onClick,
  children,
}: {
  theme: { bg: string; accent: string };
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl py-2.5 text-lg font-bold transition-transform active:scale-[0.98]"
      style={{ background: theme.bg, color: theme.accent, boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
    >
      {children}
    </button>
  );
}
