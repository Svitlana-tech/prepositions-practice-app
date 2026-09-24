"use client";

import { useEffect, useRef, useState } from "react";
import { shuffle } from "@/lib/shuffle";
import { recordFirstTry } from "@/lib/mistakes";
import { PrepositionCardsQuestion } from "@/components/student/PrepositionCards";
import type { FillInBlankPayload } from "@/components/student/QuestionRenderers";

/**
 * Endless full-screen practice: draws one preposition sentence at a time from a shuffled
 * deck of every published task in the topic, reshuffling and looping once the deck runs
 * out — same "cards loop forever" model as VocabFlashcards.tsx. Unlike the old drum deck,
 * there's no Check/Next bar here: PrepositionCardsQuestion (standalone) owns its own
 * Confirm/Next button and unlimited-attempts retry loop. Advancing is student-driven (Next
 * button or a swipe once solved), not automatic — they need a moment to re-read the
 * completed sentence and its explanation first.
 */
export function PrepositionCardsDeck({ categoryId }: { categoryId: string }) {
  const deckRef = useRef<string[]>([]);
  const posRef = useRef(0);
  const drawCountRef = useRef(0);
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
    fetch(`/api/practice/deck?type=FILL_IN_SENTENCE&categoryId=${categoryId}`)
      .then((res) => res.json())
      .then((data) => {
        const ids: string[] = data.taskIds ?? [];
        if (ids.length === 0) {
          setError("There are no questions here yet.");
          return;
        }
        deckRef.current = shuffle(ids);
        posRef.current = 0;
        setCurrentId(deckRef.current[0]);
      })
      .catch(() => setError("Could not load the practice deck."));
  }, [categoryId]);

  useEffect(() => {
    if (!currentId) return;
    setPayload(null);
    fetch(`/api/tasks/${currentId}`)
      .then((res) => res.json())
      .then((data) => setPayload(data.payload));
  }, [currentId]);

  function drawNext() {
    posRef.current += 1;
    if (posRef.current >= deckRef.current.length) {
      deckRef.current = shuffle(deckRef.current);
      posRef.current = 0;
    }
    drawCountRef.current += 1;
    setDrawCount(drawCountRef.current);
    setCurrentId(deckRef.current[posRef.current]);
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
          onSolved={drawNext}
        />
      )}
    </div>
  );
}
