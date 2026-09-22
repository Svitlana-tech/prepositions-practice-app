"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
} from "react";
import { Button } from "@/components/ui/Button";
import { vocabCardFontSize } from "@/lib/vocabCardText";

type Word = { id: string; ukrainian: string; answers: string[] };

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isCorrectAnswer(value: string, answers: string[]): boolean {
  const given = value.trim().toLowerCase();
  return answers.some((a) => a.trim().toLowerCase() === given);
}

const SETTLE_MS = 280;
type Phase = "idle" | "dragging" | "settling";

/**
 * Untimed, self-paced typing practice: the student sees the Ukrainian word, types the English
 * answer and checks it — right or wrong, no partial credit, and a wrong answer immediately
 * reveals the correct one. Swiping up (only possible once checked, so it never fights with
 * typing into the field) advances to the next word in a fresh random order, looping forever.
 */
export function VocabWrittenPractice({ words }: { words: Word[] }) {
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

  const [current, setCurrent] = useState<Word | null>(null);
  const [next, setNext] = useState<Word | null>(null);

  // Draw the first two cards before paint, so the first frame already has a word to show and a
  // preview ready for whenever the student swipes up.
  useLayoutEffect(() => {
    if (current === null) {
      setCurrent(drawNext());
      setNext(drawNext());
    }
  }, [current, drawNext]);

  const [inputValue, setInputValue] = useState("");
  const [checked, setChecked] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [current?.id]);

  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const [dragY, setDragY] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [gestureHeight, setGestureHeight] = useState(0);
  const [willAdvance, setWillAdvance] = useState(false);

  // Pointer events from a fast real swipe (or from automated test drivers) can arrive faster
  // than React re-renders, so several move/up events land in the same batch and would otherwise
  // read each other's *stale pre-batch* state. This ref is the immediately-consistent source of
  // truth the handlers make decisions from; the state above only drives what's painted.
  const gesture = useRef<{ phase: Phase; height: number; dragY: number }>({ phase: "idle", height: 0, dragY: 0 });

  function handleCheck() {
    if (!current || !inputValue.trim()) return;
    setChecked(isCorrectAnswer(inputValue, current.answers));
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    // Only draggable once checked — before that the card must behave like a normal form.
    if (checked === null || gesture.current.phase !== "idle" || !containerRef.current) return;
    const height = containerRef.current.getBoundingClientRect().height;
    gesture.current = { phase: "dragging", height, dragY: 0 };
    containerRef.current.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    setGestureHeight(height);
    setPhase("dragging");
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (gesture.current.phase !== "dragging") return;
    const delta = Math.max(-gesture.current.height, Math.min(0, e.clientY - startY.current));
    gesture.current.dragY = delta;
    setDragY(delta);
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    if (gesture.current.phase !== "dragging") return;
    containerRef.current?.releasePointerCapture(e.pointerId);
    const threshold = Math.min(gesture.current.height * 0.25, 120);
    const advance = gesture.current.dragY <= -threshold;
    gesture.current.phase = "settling";
    setWillAdvance(advance);
    setPhase("settling");
  }

  function handleTransitionEnd() {
    if (gesture.current.phase !== "settling") return;
    if (willAdvance) {
      setCurrent(next);
      setNext(drawNext());
      setInputValue("");
      setChecked(null);
    }
    gesture.current = { phase: "idle", height: 0, dragY: 0 };
    setDragY(0);
    setPhase("idle");
  }

  const displayY = phase === "settling" ? (willAdvance ? -gestureHeight : 0) : dragY;
  const transition = phase === "settling" ? `transform ${SETTLE_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : "none";

  if (!current) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="relative w-full max-w-sm touch-none select-none overflow-hidden rounded-2xl"
        style={{ aspectRatio: "9 / 16" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {next && (
          <PracticeCardFace word={next} style={{ transform: `translateY(calc(100% + ${displayY}px))`, transition }} />
        )}
        <PracticeCardFace
          word={current}
          style={{ transform: `translateY(${displayY}px)`, transition }}
          onTransitionEnd={handleTransitionEnd}
          interactive
          inputRef={inputRef}
          inputValue={inputValue}
          onInputChange={setInputValue}
          checked={checked}
          onCheck={handleCheck}
        />
      </div>
      <p className="text-xs text-gray-400">
        {checked === null ? "Type the word and press Check" : "Swipe up for the next word"}
      </p>
    </div>
  );
}

function PracticeCardFace({
  word,
  style,
  onTransitionEnd,
  interactive = false,
  inputRef,
  inputValue = "",
  onInputChange,
  checked = null,
  onCheck,
}: {
  word: Word;
  style: CSSProperties;
  onTransitionEnd?: () => void;
  interactive?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  checked?: boolean | null;
  onCheck?: () => void;
}) {
  const stateClasses =
    checked === null ? "border-gray-300" : checked ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";

  return (
    <div className="absolute inset-0" style={style} onTransitionEnd={onTransitionEnd}>
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-1 items-center justify-center p-4 text-center">
          <span className="break-words font-semibold text-gray-900" style={{ fontSize: vocabCardFontSize(word.ukrainian) }}>
            {word.ukrainian}
          </span>
        </div>

        <div className="flex flex-col gap-2 border-t border-gray-100 p-4">
          <div className="text-sm font-medium text-gray-500">Type the word</div>
          <input
            ref={interactive ? inputRef : undefined}
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="done"
            disabled={!interactive || checked !== null}
            value={interactive ? inputValue : ""}
            onChange={(e) => onInputChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onCheck?.();
              }
            }}
            className={`rounded-lg border px-3 py-2 text-lg ${stateClasses}`}
          />
          {interactive && checked === null && (
            <Button onClick={onCheck} disabled={!inputValue.trim()}>
              Check
            </Button>
          )}
          {checked !== null && (
            <div className={`text-sm font-medium ${checked ? "text-green-700" : "text-red-700"}`}>
              {checked ? "Correct!" : `Incorrect — correct answer: ${word.answers.join(" / ")}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
