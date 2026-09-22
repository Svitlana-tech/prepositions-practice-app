import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { dismissFillInInstructions, isFillInInstructionsDismissed } from "@/lib/dismissedHints";
import { shuffle } from "@/lib/shuffle";
import { PrepositionCardsQuestion } from "@/components/student/PrepositionCards";

export type SentencePayload = { sentence: string; options: string[] };
export type ClozePayload = {
  text: string;
  gaps: { id: string }[];
  wordBank: string[];
  /** How students fill the gaps. Missing on older tasks — treat as "dropdown". */
  displayMode?: "dropdown" | "wordBank";
};
export type TextMcqPayload = {
  text: string;
  gaps: { id: string; options: string[] }[];
};
/** No per-gap options at all — the student types the answer (or, for a single-gap
 *  preposition sentence, taps a curated "cards" grid). Shared shape for
 *  FILL_IN_SENTENCE/FILL_IN_TEXT. The answer key is never sent to the client — for cards
 *  mode `options` is the visible (non-secret) choice set, and correctness is only known
 *  once checkResult comes back. */
export type FillInBlankPayload = {
  text: string;
  gaps: { id: string }[];
  /** Missing on older tasks — treat as "type". */
  displayMode?: "type" | "cards";
  /** Cards mode only: the curated tappable option set. */
  options?: string[];
};
export type QuestionPayload = SentencePayload | ClozePayload | TextMcqPayload | FillInBlankPayload;

export type CheckResult = {
  score: number;
  maxScore: number;
  perGapResults: { gapId: string; correct: boolean }[];
  reveal: {
    correctIndex?: number;
    correctAnswers?: Record<string, string>;
    correctIndexes?: Record<string, number>;
  };
  explanation: string | null;
  /** When true, the preposition cards deck shows `explanation` behind a "Read full
   *  explanation" link instead of inline text. Other renderers ignore this field. */
  explanationIsLong?: boolean;
};

/** Distinguishes the question shapes a QuestionPayload can take. */
export function isTextMcqPayload(payload: QuestionPayload): payload is TextMcqPayload {
  return (
    "gaps" in payload &&
    !("wordBank" in payload) &&
    payload.gaps.length > 0 &&
    "options" in payload.gaps[0]
  );
}
export function isClozePayload(payload: QuestionPayload): payload is ClozePayload {
  return "wordBank" in payload;
}
export function isFillInBlankPayload(payload: QuestionPayload): payload is FillInBlankPayload {
  return (
    "gaps" in payload &&
    !("wordBank" in payload) &&
    payload.gaps.length > 0 &&
    !("options" in payload.gaps[0])
  );
}

/** One answer per gap of the current question; SENTENCE_MCQ always has a single gap "1". */
export type CurrentAnswers = Record<string, string | number>;

function splitClozeText(text: string): Array<{ type: "text"; value: string } | { type: "gap"; id: string }> {
  return text.split(/(\{[^}]+\})/g).map((part) => {
    const match = part.match(/^\{([^}]+)\}$/);
    return match ? { type: "gap" as const, id: match[1] } : { type: "text" as const, value: part };
  });
}

/**
 * Shows one multiple-choice question with a sentence gap. `checkResult` is null while the
 * student is still choosing; once set (practice mode), options light up green/red and further
 * clicks are disabled. Test mode never passes a checkResult, so a choice can be changed freely.
 */
export function SentenceQuestion({
  payload,
  selected,
  onSelect,
  checkResult,
}: {
  payload: SentencePayload;
  selected: number | null;
  onSelect: (idx: number) => void;
  checkResult: CheckResult | null;
}) {
  const [before, after] = payload.sentence.split("___");
  const isCorrect = checkResult ? checkResult.score === checkResult.maxScore : null;

  return (
    <>
      <p className="text-lg text-gray-900">
        {before}
        <span className="mx-1 inline-block min-w-[3rem] border-b-2 border-gray-400 text-center font-medium text-blue-700">
          {selected !== null ? payload.options[selected] : "     "}
        </span>
        {after}
      </p>

      <div className="flex flex-col gap-2">
        {payload.options.map((option, idx) => {
          const isSelected = selected === idx;
          let stateClasses = "border-gray-300 hover:border-blue-400";
          if (checkResult) {
            if (idx === selected) {
              stateClasses = isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
            } else if (idx === checkResult.reveal.correctIndex) {
              stateClasses = "border-green-500 bg-green-50";
            }
          } else if (isSelected) {
            stateClasses = "border-blue-500 bg-blue-50";
          }
          return (
            <button
              key={idx}
              type="button"
              disabled={!!checkResult}
              onClick={() => onSelect(idx)}
              className={`rounded-lg border px-4 py-2 text-left transition-colors disabled:cursor-default ${stateClasses}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </>
  );
}

/**
 * Text with several gaps, each its own dropdown of 4 options (unlike ClozeQuestion,
 * where every gap draws from one shared word bank). The only display mode — no
 * word-bank alternative for this question type.
 */
export function TextMcqQuestion({
  payload,
  answers,
  onChange,
  checkResult,
}: {
  payload: TextMcqPayload;
  answers: CurrentAnswers;
  onChange: (gapId: string, optionIndex: number) => void;
  checkResult: CheckResult | null;
}) {
  const segments = splitClozeText(payload.text);
  const gapResultById = new Map(checkResult?.perGapResults.map((r) => [r.gapId, r.correct]));
  const gapsById = new Map(payload.gaps.map((g) => [g.id, g]));

  return (
    <p className="text-lg leading-loose text-gray-900">
      {segments.map((segment, idx) => {
        if (segment.type === "text") return <span key={idx}>{segment.value}</span>;
        const gapId = segment.id;
        const gap = gapsById.get(gapId);
        if (!gap) return null;
        const isCorrect = gapResultById.get(gapId);
        let stateClasses = "border-gray-300";
        if (checkResult) {
          stateClasses = isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
        }
        const selected = typeof answers[gapId] === "number" ? (answers[gapId] as number) : "";
        const correctIndex = checkResult?.reveal.correctIndexes?.[gapId];
        return (
          <span key={idx} className="mx-1 inline-flex flex-col items-center align-middle">
            <select
              value={selected}
              onChange={(e) => onChange(gapId, Number(e.target.value))}
              disabled={!!checkResult}
              className={`rounded-lg border px-2 py-1 text-base ${stateClasses}`}
            >
              <option value="" disabled>
                choose...
              </option>
              {gap.options.map((option, optIdx) => (
                <option key={optIdx} value={optIdx}>
                  {option}
                </option>
              ))}
            </select>
            {checkResult && !isCorrect && correctIndex !== undefined && (
              <span className="mt-1 text-xs font-medium text-green-700">
                {gap.options[correctIndex]}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}

/**
 * Text (a sentence or a longer passage) with one or more gaps. Dispatches to the preposition
 * cards picker for a single-gap sentence with displayMode "cards" (single-attempt here —
 * the unlimited-retry version lives only on the dedicated endless practice page, which
 * renders PrepositionCardsQuestion directly with standalone=true); otherwise the student
 * types the answer into an inline text box (below).
 */
export function FillInBlankQuestion(props: {
  payload: FillInBlankPayload;
  answers: CurrentAnswers;
  onChange: (gapId: string, value: string) => void;
  checkResult: CheckResult | null;
  instructions?: string | null;
}) {
  if (props.payload.displayMode === "cards" && props.payload.gaps.length === 1) {
    return (
      <PrepositionCardsQuestion
        key={props.payload.text}
        payload={props.payload}
        answers={props.answers}
        onChange={props.onChange}
        checkResult={props.checkResult}
      />
    );
  }
  return <TypedFillInBlankQuestion {...props} />;
}

/**
 * The student types the answer into an inline text box. Matching is case-sensitive, so the
 * input grows to fit what's typed but otherwise behaves like a plain text field.
 *
 * Gap inputs are wired so pressing the keyboard's action button (Enter/Next/Done) jumps to the
 * next gap instead of just closing the keyboard — on Android, a plain text input otherwise
 * forces the student to dismiss the keyboard and re-tap the next gap after every word.
 */
function TypedFillInBlankQuestion({
  payload,
  answers,
  onChange,
  checkResult,
  instructions,
}: {
  payload: FillInBlankPayload;
  answers: CurrentAnswers;
  onChange: (gapId: string, value: string) => void;
  checkResult: CheckResult | null;
  instructions?: string | null;
}) {
  const segments = splitClozeText(payload.text);
  const gapResultById = new Map(checkResult?.perGapResults.map((r) => [r.gapId, r.correct]));
  const gapIds = payload.gaps.map((g) => g.id);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [instructionsDismissed, setInstructionsDismissed] = useState(isFillInInstructionsDismissed);

  function handleDismissInstructions() {
    dismissFillInInstructions();
    setInstructionsDismissed(true);
  }

  function focusGap(gapId: string | undefined) {
    if (!gapId) return;
    inputRefs.current[gapId]?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>, gapId: string) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const nextGapId = gapIds[gapIds.indexOf(gapId) + 1];
    if (nextGapId) {
      focusGap(nextGapId);
    } else {
      e.currentTarget.blur();
    }
  }

  return (
    <>
      {instructions && !instructionsDismissed && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <p>{instructions}</p>
          <button
            type="button"
            onClick={handleDismissInstructions}
            className="mt-2 text-xs font-medium text-amber-700 underline hover:text-amber-900"
          >
            Don&apos;t show this again
          </button>
        </div>
      )}
      <p className="text-lg leading-loose text-gray-900">
        {segments.map((segment, idx) => {
          if (segment.type === "text") return <span key={idx}>{segment.value}</span>;
          const gapId = segment.id;
          const value = typeof answers[gapId] === "string" ? (answers[gapId] as string) : "";
          const isCorrect = gapResultById.get(gapId);
          const isLastGap = gapIds.indexOf(gapId) === gapIds.length - 1;
          let stateClasses = "border-gray-300";
          if (checkResult) {
            stateClasses = isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
          }
          return (
            <span key={idx} className="mx-1 inline-flex flex-col items-center align-middle">
              <input
                ref={(el) => {
                  inputRefs.current[gapId] = el;
                }}
                type="text"
                value={value}
                onChange={(e) => onChange(gapId, e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, gapId)}
                disabled={!!checkResult}
                size={Math.max(4, value.length || 8)}
                enterKeyHint={isLastGap ? "done" : "next"}
                className={`inline-block rounded-lg border px-2 py-1 text-base ${stateClasses}`}
              />
              {checkResult && !isCorrect && checkResult.reveal.correctAnswers?.[gapId] && (
                <span className="mt-1 text-xs font-medium text-green-700">
                  {checkResult.reveal.correctAnswers[gapId]}
                </span>
              )}
            </span>
          );
        })}
      </p>
    </>
  );
}

export function ClozeQuestion(props: {
  payload: ClozePayload;
  answers: CurrentAnswers;
  onChange: (gapId: string, value: string) => void;
  checkResult: CheckResult | null;
  /** Pin the word tray to the bottom of the screen instead of the normal page flow. Default
   *  true; set false for a small embedded preview (e.g. the teacher's live preview card),
   *  where "stick to the viewport" doesn't make sense. */
  fixedTray?: boolean;
}) {
  if (props.payload.displayMode === "wordBank") {
    return <ClozeWordBankQuestion {...props} />;
  }
  return <ClozeDropdownQuestion {...props} />;
}

function ClozeDropdownQuestion({
  payload,
  answers,
  onChange,
  checkResult,
}: {
  payload: ClozePayload;
  answers: CurrentAnswers;
  onChange: (gapId: string, value: string) => void;
  checkResult: CheckResult | null;
}) {
  const segments = splitClozeText(payload.text);
  const gapResultById = new Map(checkResult?.perGapResults.map((r) => [r.gapId, r.correct]));

  return (
    <>
      <p className="text-lg leading-loose text-gray-900">
        {segments.map((segment, idx) => {
          if (segment.type === "text") return <span key={idx}>{segment.value}</span>;
          const gapId = segment.id;
          const isCorrect = gapResultById.get(gapId);
          let stateClasses = "border-gray-300";
          if (checkResult) {
            stateClasses = isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
          }
          return (
            <span key={idx} className="mx-1 inline-flex flex-col items-center align-middle">
              <select
                value={typeof answers[gapId] === "string" ? (answers[gapId] as string) : ""}
                onChange={(e) => onChange(gapId, e.target.value)}
                disabled={!!checkResult}
                className={`rounded-lg border px-2 py-1 text-base ${stateClasses}`}
              >
                <option value="" disabled>
                  choose...
                </option>
                {payload.wordBank.map((word) => (
                  <option key={word} value={word}>
                    {word}
                  </option>
                ))}
              </select>
              {checkResult && !isCorrect && checkResult.reveal.correctAnswers?.[gapId] && (
                <span className="mt-1 text-xs font-medium text-green-700">
                  {checkResult.reveal.correctAnswers[gapId]}
                </span>
              )}
            </span>
          );
        })}
      </p>
    </>
  );
}

/** Words still available to place, i.e. the word bank minus whatever is currently sitting in a gap. */
function remainingWords(wordBank: string[], answers: CurrentAnswers, gapIds: string[]): string[] {
  const usedCounts = new Map<string, number>();
  for (const gapId of gapIds) {
    const value = answers[gapId];
    if (typeof value === "string" && value !== "") {
      usedCounts.set(value, (usedCounts.get(value) ?? 0) + 1);
    }
  }
  const pool: string[] = [];
  for (const word of wordBank) {
    const remaining = usedCounts.get(word) ?? 0;
    if (remaining > 0) {
      usedCounts.set(word, remaining - 1);
    } else {
      pool.push(word);
    }
  }
  return pool;
}

/**
 * Word-bank variant: unused words sit in a pool below the text as buttons. Students drag a
 * word onto a gap (desktop), or tap a word to pick it up and then tap the gap it belongs in —
 * which also works on touchscreens where native drag-and-drop is unreliable, and lets a
 * student skip a gap they're unsure of and come back to it later instead of always filling
 * gaps left to right. Tapping a filled gap with nothing picked up sends its word back to the
 * pool; tapping a filled gap while a word is picked up swaps it in.
 */
function ClozeWordBankQuestion({
  payload,
  answers,
  onChange,
  checkResult,
  fixedTray = true,
}: {
  payload: ClozePayload;
  answers: CurrentAnswers;
  onChange: (gapId: string, value: string) => void;
  checkResult: CheckResult | null;
  fixedTray?: boolean;
}) {
  const segments = splitClozeText(payload.text);
  const gapIds = payload.gaps.map((g) => g.id);
  const gapResultById = new Map(checkResult?.perGapResults.map((r) => [r.gapId, r.correct]));
  const disabled = !!checkResult;
  const trayRef = useRef<HTMLDivElement>(null);
  const [trayHeight, setTrayHeight] = useState(0);

  // Shuffled once per question so the tray doesn't just list the words in the order they
  // belong in the text. Re-shuffles only when the question itself changes, not on every
  // answer/check re-render.
  const [shuffledBank, setShuffledBank] = useState(() => shuffle(payload.wordBank));
  // The word the student has picked up from the tray and is about to place — null means
  // nothing is picked up yet.
  const [pickedUpWord, setPickedUpWord] = useState<string | null>(null);
  useEffect(() => {
    setShuffledBank(shuffle(payload.wordBank));
    setPickedUpWord(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload.text]);

  const pool = remainingWords(shuffledBank, answers, gapIds);

  function placeInGap(gapId: string, word: string) {
    if (disabled) return;
    onChange(gapId, word);
    setPickedUpWord(null);
  }

  // The word tray is pinned to the bottom of the screen so it stays reachable while the
  // text scrolls underneath, however long the text is. This spacer reserves the same
  // amount of space in normal flow so the tray never covers the last line of text or the
  // Check button that follows.
  useEffect(() => {
    if (!fixedTray) return;
    const el = trayRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => setTrayHeight(entries[0].contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, [fixedTray]);

  return (
    <>
      <p className="text-lg leading-loose text-gray-900">
        {segments.map((segment, idx) => {
          if (segment.type === "text") return <span key={idx}>{segment.value}</span>;
          const gapId = segment.id;
          const value = typeof answers[gapId] === "string" ? (answers[gapId] as string) : "";
          const isCorrect = gapResultById.get(gapId);
          let stateClasses = "border-gray-400 bg-gray-50 text-gray-400";
          if (checkResult) {
            stateClasses = isCorrect
              ? "border-green-500 bg-green-50 text-green-800"
              : "border-red-500 bg-red-50 text-red-800";
          } else if (pickedUpWord) {
            stateClasses = value
              ? "border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-300"
              : "border-blue-500 bg-blue-50/60 text-gray-400 ring-2 ring-blue-200";
          } else if (value) {
            stateClasses = "border-blue-400 bg-blue-50 text-blue-800 cursor-pointer";
          }
          return (
            <span key={idx} className="mx-1 inline-flex flex-col items-center align-middle">
              <span
                role={!disabled ? "button" : undefined}
                onClick={() => {
                  if (disabled) return;
                  if (pickedUpWord) {
                    placeInGap(gapId, pickedUpWord);
                  } else if (value) {
                    onChange(gapId, "");
                  }
                }}
                onDragOver={(e) => !disabled && e.preventDefault()}
                onDrop={(e) => {
                  if (disabled) return;
                  e.preventDefault();
                  const word = e.dataTransfer.getData("text/plain");
                  if (word) placeInGap(gapId, word);
                }}
                className={`inline-block min-w-[4.5rem] rounded-lg border border-dashed px-2 py-0.5 text-center text-base font-medium leading-snug ${stateClasses}`}
                title={
                  !disabled
                    ? pickedUpWord
                      ? `Tap to place "${pickedUpWord}" here`
                      : value
                        ? "Tap to remove"
                        : undefined
                    : undefined
                }
              >
                {value || " "}
              </span>
              {checkResult && !isCorrect && checkResult.reveal.correctAnswers?.[gapId] && (
                <span className="mt-1 text-xs font-medium text-green-700">
                  {checkResult.reveal.correctAnswers[gapId]}
                </span>
              )}
            </span>
          );
        })}
      </p>

      {(() => {
        const hint = pickedUpWord ? (
          <span className="w-full text-xs font-medium text-blue-700">
            Tap the gap for &ldquo;{pickedUpWord}&rdquo; (or tap it again to cancel).
          </span>
        ) : (
          pool.length > 0 &&
          !disabled && (
            <span className="w-full text-xs text-gray-400">Tap a word, then tap the gap for it.</span>
          )
        );

        const words = (
          <>
            {hint}
            {pool.length === 0 && (
              <span className="text-sm text-gray-400">
                {disabled ? "" : "All words placed."}
              </span>
            )}
            {pool.map((word, idx) => (
              <button
                key={`${word}-${idx}`}
                type="button"
                draggable={!disabled}
                disabled={disabled}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", word);
                  setPickedUpWord(null);
                }}
                onClick={() => !disabled && setPickedUpWord((prev) => (prev === word ? null : word))}
                className={`cursor-grab rounded-full border px-3 py-1 text-sm active:cursor-grabbing disabled:cursor-default disabled:opacity-50 ${
                  pickedUpWord === word
                    ? "border-blue-500 bg-blue-100 text-blue-800 ring-2 ring-blue-300"
                    : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                {word}
              </button>
            ))}
          </>
        );

        if (!fixedTray) {
          return <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-3">{words}</div>;
        }

        return (
          <>
            <div style={{ height: trayHeight }} aria-hidden="true" />
            <div
              ref={trayRef}
              className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur-sm"
            >
              <div className="mx-auto flex max-w-2xl flex-wrap gap-2 px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:max-w-3xl lg:max-w-4xl">
                {words}
              </div>
            </div>
          </>
        );
      })()}
    </>
  );
}
