"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { shuffle } from "@/lib/shuffle";
import { recordFirstTry } from "@/lib/mistakes";
import { forgetSeen, getSeenIds, markSeen } from "@/lib/seenTasks";
import { PrepositionCardsQuestion } from "@/components/student/PrepositionCards";
import type { FillInBlankPayload } from "@/components/student/QuestionRenderers";

/**
 * Free Flow — endless full-screen practice over every topic, no score. Each draw first
 * picks a topic by weight (so topics come up about equally often, Academic Writing half
 * as often — see freeFlowWeight), then that topic's next unseen sentence; a topic whose
 * sentences have all been seen starts a new cycle. A break screen offers a rest every
 * BREAK_EVERY cards. Unlike the old drum deck,
 * there's no Check/Next bar here: PrepositionCardsQuestion (standalone) owns its own
 * Confirm/Next button and unlimited-attempts retry loop. Advancing is student-driven (Next
 * button or a swipe once solved), not automatic — they need a moment to re-read the
 * completed sentence and its explanation first.
 */
const BREAK_EVERY = 20;

type TopicGroup = { weight: number; taskIds: string[]; queue: string[] };

/** A topic's next sentence: its unseen ones in random order; once all have been seen,
 *  the topic's cycle restarts (its "seen" marks are forgotten). */
function nextFromTopic(group: TopicGroup): string {
  if (group.queue.length === 0) {
    const seen = new Set(getSeenIds());
    let unseen = group.taskIds.filter((id) => !seen.has(id));
    if (unseen.length === 0) {
      forgetSeen(group.taskIds);
      unseen = group.taskIds;
    }
    group.queue = shuffle(unseen);
  }
  return group.queue.shift()!;
}

function pickTopic(groups: TopicGroup[]): TopicGroup {
  const total = groups.reduce((sum, g) => sum + g.weight, 0);
  let r = Math.random() * total;
  for (const g of groups) {
    r -= g.weight;
    if (r < 0) return g;
  }
  return groups[groups.length - 1];
}

export function PrepositionCardsDeck() {
  const router = useRouter();
  const groupsRef = useRef<TopicGroup[]>([]);
  const drawCountRef = useRef(0);
  const solvedCountRef = useRef(0);
  // The draw whose first Confirm was already recorded for Fix Mistakes — retries after a
  // wrong guess don't count, only the first try on each card does.
  const firstTryDrawRef = useRef<number | null>(null);

  const [currentId, setCurrentId] = useState<string | null>(null);
  // Bumped on every draw, even when the same task id comes up twice in a row (a small or
  // just-reshuffled deck can repeat), so `key` below always remounts the question and
  // resets its solved/wrongWords state instead of getting stuck showing "solved".
  const [drawCount, setDrawCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<FillInBlankPayload | null>(null);
  const [onBreak, setOnBreak] = useState(false);

  // Lock the page itself from scrolling/bouncing while this is open (same fix the drum
  // needed for iOS Safari's own rubber-band bounce swallowing gestures at the body level).
  useEffect(() => {
    const body = document.body;
    const prev = {
      position: body.style.position,
      overflow: body.style.overflow,
      width: body.style.width,
      height: body.style.height,
    };
    body.style.position = "fixed";
    body.style.overflow = "hidden";
    body.style.width = "100%";
    body.style.height = "100%";
    return () => {
      body.style.position = prev.position;
      body.style.overflow = prev.overflow;
      body.style.width = prev.width;
      body.style.height = prev.height;
    };
  }, []);

  useEffect(() => {
    fetch("/api/practice/free-flow")
      .then((res) => res.json())
      .then((data) => {
        const groups: TopicGroup[] = (data.groups ?? [])
          .filter((g: { taskIds: string[] }) => g.taskIds.length > 0)
          .map((g: { weight: number; taskIds: string[] }) => ({ weight: g.weight, taskIds: g.taskIds, queue: [] }));
        if (groups.length === 0) {
          setError("There are no questions here yet.");
          return;
        }
        groupsRef.current = groups;
        setCurrentId(nextFromTopic(pickTopic(groups)));
      })
      .catch(() => setError("Could not load the practice deck."));
  }, []);

  useEffect(() => {
    if (!currentId) return;
    markSeen(currentId);
    setPayload(null);
    fetch(`/api/tasks/${currentId}`)
      .then((res) => res.json())
      .then((data) => setPayload(data.payload));
  }, [currentId]);

  function drawNext() {
    let next = nextFromTopic(pickTopic(groupsRef.current));
    // Don't show the same sentence twice in a row when there's anything else to show.
    if (next === currentId && groupsRef.current.some((g) => g.taskIds.length > 1)) {
      next = nextFromTopic(pickTopic(groupsRef.current));
    }
    drawCountRef.current += 1;
    setDrawCount(drawCountRef.current);
    setCurrentId(next);
  }

  function handleSolved() {
    solvedCountRef.current += 1;
    if (solvedCountRef.current % BREAK_EVERY === 0) setOnBreak(true);
    else drawNext();
  }

  function keepGoing() {
    setOnBreak(false);
    drawNext();
  }

  async function checkAnswer(
    taskId: string,
    gapId: string,
    word: string
  ): Promise<{ correct: boolean; explanation: string | null; explanationIsLong: boolean }> {
    const res = await fetch("/api/practice/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, answers: { [gapId]: word } }),
    });
    const result = await res.json().catch(() => null);
    const correct =
      result?.perGapResults?.find((r: { gapId: string; correct: boolean }) => r.gapId === gapId)?.correct ?? false;
    if (result && firstTryDrawRef.current !== drawCountRef.current) {
      firstTryDrawRef.current = drawCountRef.current;
      recordFirstTry(taskId, correct);
    }
    return {
      correct,
      explanation: result?.explanation ?? null,
      explanationIsLong: result?.explanationIsLong === true,
    };
  }

  if (error) {
    return (
      <div className="flex h-dvh items-center justify-center overscroll-none bg-[#FAF7F2] px-6 text-center text-[#2B2B2B]">
        {error}
      </div>
    );
  }

  if (onBreak) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-8 overscroll-none bg-[#FAF7F2] px-6 text-center">
        <div>
          <div className="text-3xl font-bold text-[#2B2D42]">{BREAK_EVERY} cards completed!</div>
          <div className="mt-2 text-lg text-[#6C757D]">Keep going or rest?</div>
        </div>
        <div className="grid w-full max-w-xs grid-cols-2 gap-4">
          <button
            type="button"
            onClick={keepGoing}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl text-lg font-bold text-white"
            style={{ background: "#2A9D8F", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
          >
            <span className="text-4xl">🚀</span>
            Keep going
          </button>
          <button
            type="button"
            onClick={() => router.push("/tasks")}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 bg-white text-lg font-bold"
            style={{ borderColor: "#2A9D8F", color: "#2A9D8F", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
          >
            <span className="text-4xl">☕</span>
            Rest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh touch-none flex-col items-center justify-center overscroll-none bg-[#FAF7F2] px-6 pt-[env(safe-area-inset-top)] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {payload && currentId && (
        <PrepositionCardsQuestion
          key={`${currentId}-${drawCount}`}
          payload={payload}
          answers={{}}
          onChange={() => {}}
          checkResult={null}
          standalone
          checkAnswer={(word) => checkAnswer(currentId, payload.gaps[0]?.id ?? "gap1", word)}
          onSolved={handleSolved}
        />
      )}
    </div>
  );
}
