"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { vocabCardFontSize } from "@/lib/vocabCardText";
import { shuffle } from "@/lib/shuffle";

type Word = { id: string; ukrainian: string; answers: string[] };

const TAP_PX = 6;
const SETTLE_MS = 280;

type Phase = "idle" | "dragging" | "settling";
type SettleDirection = "up" | "down" | "cancel";

/**
 * An untimed, self-paced deck: cards loop forever in a fresh random order each lap, there's no
 * score and nothing is submitted anywhere. Tap the card to flip it; swipe up for the next word,
 * swipe down to go back to the one before — like a single vertical slot-machine reel.
 */
export function VocabFlashcards({ words }: { words: Word[] }) {
  const deckRef = useRef<Word[]>(shuffle(words));
  const deckPosRef = useRef(0);

  const drawNext = useCallback((): Word => {
    if (deckPosRef.current >= deckRef.current.length) {
      deckRef.current = shuffle(words);
      deckPosRef.current = 0;
    }
    const word = deckRef.current[deckPosRef.current];
    deckPosRef.current += 1;
    return word;
  }, [words]);

  const [history, setHistory] = useState<Word[]>([]);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Keep two cards of lookahead (current + next), drawn ahead of time so the preview revealed
  // mid-swipe is the exact card that lands once the swipe completes, never a different pick
  // made afterwards. Runs before paint so the very first frame already has a card to show.
  useLayoutEffect(() => {
    setHistory((h) => {
      const need = position + 2 - h.length;
      if (need <= 0) return h;
      return [...h, ...Array.from({ length: need }, drawNext)];
    });
  }, [position, drawNext]);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const [dragY, setDragY] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [gestureHeight, setGestureHeight] = useState(0);
  const [settleDirection, setSettleDirection] = useState<SettleDirection>("cancel");

  const currentWord = history[position];
  const nextWord = history[position + 1] ?? currentWord;
  const prevWord = position > 0 ? history[position - 1] : null;

  // Pointer events from a fast real swipe (or from automated test drivers) can arrive faster
  // than React re-renders, so several move/up events land in the same batch and would otherwise
  // read each other's *stale pre-batch* state. This ref is the immediately-consistent source of
  // truth the handlers make decisions from; the state above only drives what's painted.
  const gesture = useRef<{ phase: Phase; height: number; dragY: number }>({ phase: "idle", height: 0, dragY: 0 });

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (gesture.current.phase !== "idle" || !containerRef.current) return;
    const height = containerRef.current.getBoundingClientRect().height;
    gesture.current = { phase: "dragging", height, dragY: 0 };
    containerRef.current.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    setGestureHeight(height);
    setPhase("dragging");
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (gesture.current.phase !== "dragging") return;
    let delta = e.clientY - startY.current;
    // No card before the first one — let the drag through with a rubber-band damping instead of
    // hard-blocking it (which would leave dragY at exactly 0 and read as a tap on release).
    if (position === 0 && delta > 0) delta *= 0.3;
    delta = Math.max(-gesture.current.height, Math.min(gesture.current.height, delta));
    gesture.current.dragY = delta;
    setDragY(delta);
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (gesture.current.phase !== "dragging") return;
    containerRef.current?.releasePointerCapture(e.pointerId);
    const { height, dragY: finalDragY } = gesture.current;

    if (Math.abs(finalDragY) < TAP_PX) {
      gesture.current.phase = "idle";
      setFlipped((f) => !f);
      setDragY(0);
      setPhase("idle");
      return;
    }

    const threshold = Math.min(height * 0.25, 120);
    let direction: SettleDirection;
    if (finalDragY <= -threshold) {
      direction = "up";
    } else if (finalDragY >= threshold && position > 0) {
      direction = "down";
    } else {
      direction = "cancel";
    }
    gesture.current.phase = "settling";
    setSettleDirection(direction);
    setPhase("settling");
  }

  function handleTransitionEnd() {
    if (gesture.current.phase !== "settling") return;
    if (settleDirection === "up") setPosition((p) => p + 1);
    else if (settleDirection === "down") setPosition((p) => p - 1);
    if (settleDirection !== "cancel") setFlipped(false);
    gesture.current = { phase: "idle", height: 0, dragY: 0 };
    setDragY(0);
    setPhase("idle");
  }

  const settleTarget = { up: -1, down: 1, cancel: 0 }[settleDirection] * gestureHeight;
  const displayY = phase === "settling" ? settleTarget : dragY;
  const transition = phase === "settling" ? `transform ${SETTLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : "none";

  if (!currentWord) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="relative w-full max-w-xl touch-none select-none overflow-hidden rounded-2xl"
        style={{ aspectRatio: "16 / 9" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {prevWord && (
          <FlashcardFace word={prevWord} flipped={false} style={{ transform: `translateY(calc(-100% + ${displayY}px))`, transition }} />
        )}
        <FlashcardFace
          word={currentWord}
          flipped={flipped}
          style={{ transform: `translateY(${displayY}px)`, transition }}
          onTransitionEnd={handleTransitionEnd}
        />
        <FlashcardFace word={nextWord} flipped={false} style={{ transform: `translateY(calc(100% + ${displayY}px))`, transition }} />
      </div>
      <p className="text-xs text-gray-400">Tap to flip · swipe up for next · swipe down to go back</p>
    </div>
  );
}

function FlashcardFace({
  word,
  flipped,
  style,
  onTransitionEnd,
}: {
  word: Word;
  flipped: boolean;
  style: CSSProperties;
  onTransitionEnd?: () => void;
}) {
  return (
    <div className="absolute inset-0" style={style} onTransitionEnd={onTransitionEnd}>
      <div className="h-full w-full" style={{ perspective: "1600px" }}>
        <div
          className="relative h-full w-full"
          style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", transition: "transform 0.5s" }}
        >
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 text-center shadow-sm"
            style={{ backfaceVisibility: "hidden" }}
          >
            <span className="break-words font-semibold text-gray-900" style={{ fontSize: vocabCardFontSize(word.ukrainian) }}>
              {word.ukrainian}
            </span>
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center shadow-sm"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <span className="break-words font-semibold text-blue-700" style={{ fontSize: vocabCardFontSize(word.answers.join(" / ")) }}>
              {word.answers.join(" / ")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
