"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { getCategoryTheme } from "@/lib/categoryTheme";
import type { TaskType } from "@/lib/taskSchemas";
import { getMistakeIds, recordFirstTry, removeMistake } from "@/lib/mistakes";
import { forgetSeen, getSeenIds, markSeen } from "@/lib/seenTasks";
import { SessionResults, type AnswerRecord } from "@/components/student/SessionResults";
import { REVEAL_DELAY_MS } from "@/components/student/PrepositionCards";
import { ReportProblem } from "@/components/student/ReportProblem";
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
/** Room kept free under the Next button for a phone browser's floating toolbar. */
const TOOLBAR_ROOM_PX = 96;
/** After the right answer lands in the sentence, a moment for its pop to play before the
 *  buttons come in. */
const ANSWER_SETTLE_MS = 450;
/** Space between the sentence and the cards, and between the cards and the buttons:
 *  48px on a tall phone screen, down to 24px on a short one, so the whole question fits
 *  without scrolling on as many phones as possible. */
const QUESTION_GAP = "clamp(24px, 7dvh - 8px, 48px)";

type LoadedTasks = Record<string, { payload: Payload; instructions: string | null }>;

export function PracticeSession({
  taskType = null,
  categoryId = null,
  group = null,
  sectionId = null,
  presetTaskIds = null,
  onRepeat,
}: {
  taskType?: TaskType | null;
  /** A single topic of that type, or null for "all topics of this type mixed". */
  categoryId?: string | null;
  /** A TOPIC_GROUPS key: several topics practiced together (no mistakes mixed in). */
  group?: string | null;
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
  const [loadedTasks, setLoadedTasks] = useState<LoadedTasks>({});
  const requestedRef = useRef<Set<string>>(new Set());
  const [retryTick, setRetryTick] = useState(0);
  const [currentAnswers, setCurrentAnswers] = useState<CurrentAnswers>({});
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [buttonsShown, setButtonsShown] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
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
        group,
        sectionId,
        mistakeTaskIds: categoryId || group ? [] : getMistakeIds(),
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
        // The questions come along with the ids; any missing one is fetched on its own below.
        const tasks: LoadedTasks = data.tasks ?? {};
        for (const id of Object.keys(tasks)) requestedRef.current.add(id);
        setLoadedTasks((loaded) => ({ ...loaded, ...tasks }));
        setTaskIds(data.taskIds);
      })
      .catch((e) => setError(e.message));
  }, [taskType, categoryId, group, sectionId, presetTaskIds]);

  // All of the session's questions load at once, as soon as the set is known, so moving
  // to the next question never waits on the network. A failed request is retried a
  // couple of seconds later (a phone briefly offline).
  useEffect(() => {
    if (!taskIds) return;
    for (const taskId of taskIds) {
      if (requestedRef.current.has(taskId)) continue;
      requestedRef.current.add(taskId);
      fetch(`/api/tasks/${taskId}`)
        .then(async (res) => {
          if (res.status === 404) {
            // Deleted/unpublished since it was saved as a mistake — drop it and move on.
            removeMistake(taskId);
            setTaskIds((ids) => ids?.filter((id) => id !== taskId) ?? null);
            return;
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          setLoadedTasks((loaded) => ({
            ...loaded,
            [taskId]: { payload: data.payload, instructions: data.instructions ?? null },
          }));
        })
        .catch(() => {
          requestedRef.current.delete(taskId);
          window.setTimeout(() => setRetryTick((t) => t + 1), 2000);
        });
    }
  }, [taskIds, retryTick]);

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

  // The screen stays still after Check: the buttons' space is reserved from the start, so
  // Next shows up where the student is already looking. Only if it would land under a
  // phone browser's floating toolbar (e.g. Telegram's in-app browser) — a short screen —
  // is it scrolled into view, with room to spare below it (its scroll-mb).
  useEffect(() => {
    if (!buttonsShown) return;
    // Next frame: the layout is still settling (Check button swapped for the feedback)
    // and a scroll started mid-change gets dropped.
    const frame = requestAnimationFrame(() => {
      const el = nextRef.current;
      if (el && el.getBoundingClientRect().bottom > window.innerHeight - TOOLBAR_ROOM_PX) {
        el.scrollIntoView({ behavior: "smooth", block: "end" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [buttonsShown]);

  // One thing at a time: Explanation and Next only come in once the right answer stands in
  // the sentence — right away after a correct answer (its pop has played), or after a
  // wrong one once the wrong-answer face is gone and the right card has lit up.
  useEffect(() => {
    if (!checkResult) return;
    const correct = checkResult.score === checkResult.maxScore;
    const cards = payload?.displayMode === "cards" && payload.gaps.length === 1;
    const delay = !cards ? 0 : (correct ? 0 : REVEAL_DELAY_MS) + ANSWER_SETTLE_MS;
    const timer = window.setTimeout(() => setButtonsShown(true), delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkResult]);

  const current = taskIds && index < taskIds.length ? loadedTasks[taskIds[index]] : undefined;
  const payload = current?.payload ?? null;
  const instructions = current?.instructions ?? null;

  const allGapsFilled =
    payload !== null &&
    payload.gaps.every((g) => currentAnswers[g.id] !== undefined && currentAnswers[g.id] !== "");

  async function handleCheck() {
    if (!taskIds || !allGapsFilled || checking) return;
    const taskId = taskIds[index];
    const questionIndex = index;
    // Check stays on screen while the answer is on its way to the server — on a slow phone
    // connection a second tap used to send it twice and fill two progress segments.
    setChecking(true);
    try {
      const res = await fetch("/api/practice/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, answers: currentAnswers }),
      });
      const result: CheckResult = await res.json();
      const correct = result.score === result.maxScore;
      setCheckResult(result);
      recordFirstTry(taskId, correct);
      if (payload) {
        const gapId = payload.gaps[0]?.id ?? "gap1";
        // One record per question, whatever happens.
        setRecords((prev) =>
          prev.length !== questionIndex
            ? prev
            : [
                ...prev,
                {
                  taskId,
                  text: payload.text,
                  chosen: String(currentAnswers[gapId] ?? ""),
                  correctAnswer: result.reveal?.correctAnswers?.[gapId] ?? "",
                  correct,
                },
              ]
        );
      }
    } finally {
      setChecking(false);
    }
  }

  function handleNext() {
    if (!taskIds) return;
    if (index + 1 < taskIds.length) {
      setCurrentAnswers({});
      setCheckResult(null);
      setButtonsShown(false);
      setShowExplanation(false);
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
    return <Spinner />;
  }

  return (
    <div className="flex flex-col gap-6" style={{ "--question-gap": QUESTION_GAP } as React.CSSProperties}>
      {/* One segment per question; once answered it turns green (right) or red (wrong),
          the same colors as the cards. */}
      <div className="flex gap-1" aria-label={`Answered ${records.length} of ${taskIds.length}`}>
        {taskIds.map((id, i) => (
          <div
            key={id}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{
              background: records[i] ? (records[i].correct ? "#22C55E" : "#EF4444") : NEXT_THEME.bg,
            }}
          />
        ))}
      </div>

      <FillInBlankQuestion
        payload={payload}
        answers={currentAnswers}
        onChange={(gapId, value) => setCurrentAnswers((prev) => ({ ...prev, [gapId]: value }))}
        checkResult={checkResult}
        instructions={instructions}
        showExplanation={showExplanation}
      />

      {/* Always as tall as the Explanation + Next pair, so swapping Check for them
          doesn't grow the page and nothing below the sentence moves. Its extra top margin
          (on top of the 24px column gap) makes the gap above it match the one between the
          sentence and the cards. */}
      <div
        className="flex min-h-[108px] flex-col gap-3"
        style={{ marginTop: "calc(var(--question-gap) - 24px)" }}
      >
        {!checkResult && (
          <Button onClick={handleCheck} disabled={!allGapsFilled || checking}>
            Check
          </Button>
        )}

        {/* Right or wrong, the answer shows in the sentence itself; the explanation opens
            only on request, and Next skips straight to the following question. */}
        {checkResult && buttonsShown && (
          <div ref={nextRef} className="flex scroll-mb-32 flex-col gap-3">
            {checkResult.explanation && (
              <SlimButton
                theme={EXPLANATION_THEME}
                order={0}
                onClick={() => setShowExplanation((open) => !open)}
              >
                {showExplanation ? "Hide explanation" : "Explanation"}
              </SlimButton>
            )}
            <SlimButton theme={NEXT_THEME} order={checkResult.explanation ? 1 : 0} onClick={handleNext}>
              {index + 1 < taskIds.length ? "Next →" : "Finish"}
            </SlimButton>
          </div>
        )}
      </div>

      <div className="-mt-3">
        <ReportProblem
          taskId={taskIds[index]}
          chosen={String(currentAnswers[payload.gaps[0]?.id ?? "gap1"] ?? "") || null}
        />
      </div>
    </div>
  );
}

/** An after-Check button. They come in one after another (`order`), rising into place. */
function SlimButton({
  theme,
  order,
  onClick,
  children,
}: {
  theme: { bg: string; accent: string };
  order: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="answer-button-in w-full rounded-2xl py-2.5 text-lg font-bold transition-transform active:scale-[0.98]"
      style={
        {
          background: theme.bg,
          color: theme.accent,
          boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
          "--i": order,
        } as React.CSSProperties
      }
    >
      {children}
    </button>
  );
}
