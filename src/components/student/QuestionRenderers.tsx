import { useRef, useState, type KeyboardEvent } from "react";
import { dismissFillInInstructions, isFillInInstructionsDismissed } from "@/lib/dismissedHints";
import { PrepositionCardsQuestion } from "@/components/student/PrepositionCards";

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
export type QuestionPayload = FillInBlankPayload;

export type CheckResult = {
  score: number;
  maxScore: number;
  perGapResults: { gapId: string; correct: boolean }[];
  reveal: {
    correctAnswers?: Record<string, string>;
  };
  explanation: string | null;
  /** When true, the preposition cards deck shows `explanation` behind a "Read full
   *  explanation" link instead of inline text. Other renderers ignore this field. */
  explanationIsLong?: boolean;
};

/** Distinguishes the question shapes a QuestionPayload can take. */
export function isFillInBlankPayload(payload: QuestionPayload): payload is FillInBlankPayload {
  return (
    "gaps" in payload &&
    payload.gaps.length > 0 &&
    !("options" in payload.gaps[0])
  );
}

/** One answer per gap of the current question. */
export type CurrentAnswers = Record<string, string | number>;

function splitClozeText(text: string): Array<{ type: "text"; value: string } | { type: "gap"; id: string }> {
  return text.split(/(\{[^}]+\})/g).map((part) => {
    const match = part.match(/^\{([^}]+)\}$/);
    return match ? { type: "gap" as const, id: match[1] } : { type: "text" as const, value: part };
  });
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
