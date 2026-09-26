"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { shuffle, randomTilt } from "@/lib/shuffle";
import type { FillInBlankPayload, CurrentAnswers, CheckResult } from "@/components/student/QuestionRenderers";

const STYLE = `
.prep-cards {
  --paper: #FAF7F2;
  --sentence: #2B2B2B;
  --card-bg: #FFFFFF;
  --card-border: #E3D9C2;
  --select-ring: #D9891F;
  --wrong: #EF4444;
  --correct: #22C55E;
  background: var(--paper);
}
.prep-cards .blank {
  display: inline-block;
  min-width: 70px;
  padding: 2px 4px;
  border-bottom: 2px solid var(--sentence);
  opacity: 0.35;
  color: var(--sentence);
  font-weight: 700;
  border-radius: 10px;
  transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease;
}
.prep-cards .blank.filled { opacity: 1; }
.prep-cards .blank.correct { color: var(--correct); }
.prep-cards .blank.wrong { color: var(--wrong); }
@keyframes prepCardsPop {
  0% { transform: scale(1); }
  45% { transform: scale(1.16); }
  100% { transform: scale(1); }
}
.prep-cards .blank.pop { animation: prepCardsPop 0.35s ease; }

.prep-cards .options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 22px 16px;
}
@keyframes prepCardsFloat {
  0%, 100% { transform: translateY(0) rotate(var(--tilt)); }
  50% { transform: translateY(-4px) rotate(var(--tilt)); }
}
.prep-cards .card-wrap { position: relative; }
.prep-cards .option {
  --tilt: 0deg;
  width: 92px;
  height: 58px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1.5px solid var(--card-border);
  font-size: 17px;
  font-weight: 700;
  color: var(--sentence);
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 6px 14px rgba(0,0,0,0.10);
  transform: rotate(var(--tilt));
  animation: prepCardsFloat 3.6s ease-in-out infinite;
  animation-delay: var(--delay);
  transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.2s ease, color 0.2s ease;
}
.prep-cards .option:active { transform: rotate(var(--tilt)) scale(0.92); }
.prep-cards .option.selected {
  box-shadow: 0 1px 2px rgba(0,0,0,0.06), 0 6px 14px rgba(0,0,0,0.10), 0 0 0 2.5px var(--select-ring);
}
.prep-cards .option.wrong { color: var(--wrong); }
.prep-cards .option.correct { color: var(--correct); }
.prep-cards .option:disabled { cursor: default; }

.prep-cards .ripple {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2.5px solid var(--correct);
  pointer-events: none;
  opacity: 0;
}
@keyframes prepCardsRipple {
  0% { transform: scale(0.6); opacity: 0.7; }
  100% { transform: scale(2.2); opacity: 0; }
}
.prep-cards .ripple.show { animation: prepCardsRipple 0.7s ease-out forwards; }

.prep-cards .lottie-overlay {
  position: fixed;
  width: 46px;
  height: 46px;
  pointer-events: none;
  z-index: 30;
  opacity: 0;
  transform: translate(-50%, -100%);
}
.prep-cards .lottie-overlay.show { opacity: 1; }

.prep-cards .explanation-scroll {
  max-height: min(55vh, 420px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.prep-cards .explanation-block {
  margin: 0 0 0.85em 0;
}
.prep-cards .explanation-block:last-child { margin-bottom: 0; }
.prep-cards .explanation-phrase {
  color: var(--select-ring);
  font-weight: 700;
}
.prep-cards .explanation-example {
  font-style: italic;
}
`;

/** How long a wrong answer's red reaction plays before the right card is lit up. */
const REVEAL_DELAY_MS = 500;

type ExplanationSentence = { text: string; isExample: boolean };
type ExplanationBlock = { phrase: string | null; sentences: ExplanationSentence[] };

const EXPLANATION_STOPWORDS = new Set([
  "to", "of", "with", "by", "for", "on", "in", "at", "the", "a", "an", "and", "or", "verb",
]);

/** Content words from a rule-bank phrase like "Agree on" or "At the end (of something)" —
 *  used to spot which trailing sentence of the paragraph is the example (it reuses the
 *  headword), as opposed to a further clause of the explanation. */
function keywordsFromPhrase(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .split(/[^a-zа-яіїє]+/i)
    .filter((w) => w.length >= 3 && !EXPLANATION_STOPWORDS.has(w))
    .map((w) => w.slice(0, 4));
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])(?:["'’”)])?\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Rule-bank entries write each preposition variant as "Phrase - explanation. Example.",
 *  one per line. The leading phrase (before the first " - ") gets highlighted, and any
 *  trailing sentence that reuses the phrase's headword is treated as the example. */
function parseExplanationBlock(paragraph: string): ExplanationBlock {
  const dashIdx = paragraph.indexOf(" - ");
  if (dashIdx === -1) {
    return { phrase: null, sentences: [{ text: paragraph, isExample: false }] };
  }
  const phrase = paragraph.slice(0, dashIdx).trim();
  const rest = paragraph.slice(dashIdx + 3).trim();
  const keywords = keywordsFromPhrase(phrase);
  const sentences = splitSentences(rest).map((text, i) => ({
    text,
    isExample: i > 0 && keywords.some((k) => text.toLowerCase().includes(k)),
  }));
  return { phrase, sentences };
}

function parseExplanationText(text: string): ExplanationBlock[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(parseExplanationBlock);
}

function useCardLayout(options: string[]) {
  return useMemo(
    () =>
      shuffle(options).map((word, i) => ({
        word,
        tilt: randomTilt(5).toFixed(1),
        delay: (i * 0.15).toFixed(2),
      })),
    [options]
  );
}

/**
 * Tap-to-choose preposition card grid (FILL_IN_SENTENCE, displayMode "cards"). Replaces
 * the earlier drag-scrollable "drum" picker, rejected in real student testing. Reference:
 * files.zip's preposition-cards-v2.html prototype.
 *
 * Two interaction contracts, chosen by `standalone`:
 * - false (default): a tap just reports the selection via onChange, like every other
 *   question type — correctness is revealed once by an externally-driven checkResult.
 *   A wrong answer gets its red reaction, then (REVEAL_DELAY_MS later) the right card lights
 *   up and fills the gap the same way a correct answer does. The explanation is only shown,
 *   in place of the cards, while the session sets `showExplanation`.
 *   Used by the normal dispatcher (bounded practice sessions, teacher preview).
 * - true: the component owns its own Confirm button and an unlimited-attempts retry
 *   loop — wrong taps stay marked red and the student can keep trying. Used only by the
 *   dedicated endless practice page (PrepositionCardsDeck), which has no Check/Next bar
 *   of its own.
 */
export function PrepositionCardsQuestion({
  payload,
  answers,
  onChange,
  checkResult,
  standalone = false,
  showExplanation = false,
  checkAnswer,
  onSolved,
}: {
  payload: FillInBlankPayload;
  answers: CurrentAnswers;
  onChange: (gapId: string, value: string) => void;
  checkResult: CheckResult | null;
  standalone?: boolean;
  /** non-standalone only: show the checked question's explanation instead of the cards. */
  showExplanation?: boolean;
  /** standalone only: verifies one guess, called per Confirm press. */
  checkAnswer?: (
    word: string
  ) => Promise<{ correct: boolean; explanation: string | null; explanationIsLong: boolean }>;
  /** standalone only: called when the student moves on (Next button or swipe), not
   *  automatically — they need time to re-read the completed sentence first. */
  onSolved?: () => void;
}) {
  const gapId = payload.gaps[0]?.id ?? "gap1";
  const marker = `{${gapId}}`;
  const markerIdx = payload.text.indexOf(marker);
  const before = markerIdx >= 0 ? payload.text.slice(0, markerIdx) : payload.text;
  const after = markerIdx >= 0 ? payload.text.slice(markerIdx + marker.length) : "";

  const cards = useCardLayout(payload.options ?? []);

  const [selected, setSelected] = useState<string | null>(
    typeof answers[gapId] === "string" ? (answers[gapId] as string) : null
  );
  const [wrongWords, setWrongWords] = useState<Set<string>>(new Set());
  const [solved, setSolved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationIsLong, setExplanationIsLong] = useState(false);
  // Only meaningful once solved — flips the question screen over to show the full rule
  // text in place of the card grid. Purely a local view toggle, never auto-shown.
  const [showFullExplanation, setShowFullExplanation] = useState(false);
  // Non-standalone, wrong answer: the right card has been lit up after the red reaction.
  const [revealed, setRevealed] = useState(false);

  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rippleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lottieOverlayRef = useRef<HTMLDivElement | null>(null);
  const lottieAnimRef = useRef<import("lottie-web").AnimationItem | null>(null);
  // Swipe-to-advance once solved — only armed after solving so it never interferes with
  // tapping a card. Any direction past the threshold counts, matching how casually kids
  // swipe (not just strictly horizontal).
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  function vibrate(pattern: number | number[]) {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(pattern);
  }

  useEffect(() => {
    let cancelled = false;
    import("lottie-web").then(({ default: lottie }) => {
      if (cancelled || !lottieOverlayRef.current) return;
      lottieAnimRef.current = lottie.loadAnimation({
        container: lottieOverlayRef.current,
        renderer: "svg",
        loop: false,
        autoplay: false,
        path: "/animations/wrong-answer.json",
      });
    });
    return () => {
      cancelled = true;
      lottieAnimRef.current?.destroy();
    };
  }, []);

  function playWrongReaction(word: string) {
    const cardEl = cardRefs.current[word];
    const overlay = lottieOverlayRef.current;
    if (!cardEl || !overlay) return;
    const rect = cardEl.getBoundingClientRect();
    overlay.style.left = `${rect.left + rect.width / 2}px`;
    overlay.style.top = `${rect.top - 4}px`;
    overlay.classList.remove("show");
    void overlay.offsetWidth;
    overlay.classList.add("show");
    lottieAnimRef.current?.goToAndPlay(0, true);
    window.setTimeout(() => overlay.classList.remove("show"), 2000);
  }

  function playRipple(word: string) {
    const el = rippleRefs.current[word];
    if (!el) return;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
  }

  // Non-standalone: react to an externally-driven checkResult arriving once.
  useEffect(() => {
    if (standalone || !checkResult) return;
    const isCorrect = checkResult.perGapResults.find((r) => r.gapId === gapId)?.correct ?? false;
    if (isCorrect && selected) {
      playRipple(selected);
      vibrate([10, 40, 10]);
      return;
    }
    if (selected) {
      setWrongWords((prev) => new Set(prev).add(selected));
      playWrongReaction(selected);
      vibrate(20);
    }
    const answer = checkResult.reveal.correctAnswers?.[gapId];
    if (!answer) return;
    const timer = window.setTimeout(() => {
      setRevealed(true);
      playRipple(answer);
    }, REVEAL_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkResult]);

  function tapCard(word: string) {
    const disabled = standalone ? solved || checking : !!checkResult;
    if (disabled) return;
    setSelected(word);
    onChange(gapId, word);
  }

  async function handleConfirm() {
    if (!selected || solved || checking || !checkAnswer) return;
    setChecking(true);
    const result = await checkAnswer(selected);
    setChecking(false);
    if (result.correct) {
      setSolved(true);
      setExplanation(result.explanation);
      setExplanationIsLong(result.explanationIsLong);
      playRipple(selected);
      vibrate([10, 40, 10]);
    } else {
      setWrongWords((prev) => new Set(prev).add(selected));
      playWrongReaction(selected);
      vibrate(20);
    }
  }

  function handleSwipeStart(e: React.PointerEvent) {
    if (!solved) return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  }

  function handleSwipeEnd(e: React.PointerEvent) {
    if (!solved || !swipeStartRef.current) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = e.clientY - swipeStartRef.current.y;
    swipeStartRef.current = null;
    if (Math.hypot(dx, dy) > 50) onSolved?.();
  }

  const nonStandaloneResult = !standalone && checkResult ? checkResult : null;
  const isCorrectNonStandalone =
    nonStandaloneResult?.perGapResults.find((r) => r.gapId === gapId)?.correct ?? false;
  const revealedAnswer = nonStandaloneResult?.reveal.correctAnswers?.[gapId];

  const blankShown = standalone ? solved : !!nonStandaloneResult && (isCorrectNonStandalone || revealed);
  const blankWord = !blankShown ? null : revealed ? revealedAnswer ?? null : selected;
  const blankWrong = !standalone && !!nonStandaloneResult && !isCorrectNonStandalone && !revealed;

  const cardsDisabled = standalone ? solved : !!checkResult;

  const shownExplanation = standalone ? explanation : nonStandaloneResult?.explanation ?? null;
  const shownExplanationIsLong = standalone ? explanationIsLong : !!nonStandaloneResult?.explanationIsLong;
  // Only rule-bank text follows the "Phrase - explanation. Example." format; a task's own
  // short explanation is shown as one plain paragraph.
  const explanationBlocks = useMemo(
    () =>
      !shownExplanation
        ? []
        : shownExplanationIsLong
          ? parseExplanationText(shownExplanation)
          : [{ phrase: null, sentences: [{ text: shownExplanation, isExample: false }] }],
    [shownExplanation, shownExplanationIsLong]
  );
  const explanationOpen = standalone ? showFullExplanation : showExplanation && !!shownExplanation;

  return (
    <div
      className="prep-cards flex flex-col gap-12"
      onPointerDown={handleSwipeStart}
      onPointerUp={handleSwipeEnd}
    >
      <style>{STYLE}</style>
      <div ref={lottieOverlayRef} className="lottie-overlay" />

      <p className="text-center text-xl font-medium leading-relaxed" style={{ color: "var(--sentence)" }}>
        {before}
        <span
          className={`blank ${blankWord || blankWrong ? "filled" : ""} ${
            blankShown ? "correct pop" : blankWrong ? "wrong" : ""
          }`}
        >
          {blankWord || " "}
        </span>
        {after}
      </p>

      {explanationOpen ? (
        <div
          className="explanation-scroll rounded-2xl bg-white p-5 text-left text-base leading-relaxed"
          style={{ color: "var(--sentence)", border: "1.5px solid var(--card-border)" }}
        >
          {explanationBlocks.map((block, i) => (
            <p key={i} className="explanation-block">
              {block.phrase && <span className="explanation-phrase">{block.phrase}</span>}
              {block.phrase && " - "}
              {block.sentences.map((s, j) => (
                <span key={j} className={s.isExample ? "explanation-example" : undefined}>
                  {s.text}{" "}
                </span>
              ))}
            </p>
          ))}
        </div>
      ) : (
        <div className="options">
          {cards.map(({ word, tilt, delay }) => {
            const isSelected = selected === word && !cardsDisabled;
            const isWrong = wrongWords.has(word);
            const isCorrectCard =
              (standalone && solved && selected === word) ||
              (!standalone && nonStandaloneResult && isCorrectNonStandalone && selected === word) ||
              (revealed && revealedAnswer === word);
            return (
              <div key={word} className="card-wrap" style={{ position: "relative" }}>
                <button
                  type="button"
                  ref={(el) => {
                    cardRefs.current[word] = el;
                  }}
                  disabled={cardsDisabled}
                  onClick={() => tapCard(word)}
                  className={`option ${isSelected ? "selected" : ""} ${isWrong && !isCorrectCard ? "wrong" : ""} ${
                    isCorrectCard ? "correct" : ""
                  }`}
                  style={{ "--tilt": `${tilt}deg`, "--delay": `${delay}s` } as React.CSSProperties}
                >
                  {word}
                </button>
                <div
                  ref={(el) => {
                    rippleRefs.current[word] = el;
                  }}
                  className="ripple"
                />
              </div>
            );
          })}
        </div>
      )}

      {standalone ? (
        showFullExplanation ? (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onSolved}
              className="w-full rounded-2xl py-3.5 text-base font-bold text-white"
              style={{ background: "var(--sentence)" }}
            >
              Next →
            </button>
            <button
              type="button"
              onClick={() => setShowFullExplanation(false)}
              className="text-center text-sm font-medium underline"
              style={{ color: "var(--sentence)", opacity: 0.6 }}
            >
              ← Back
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={solved ? onSolved : handleConfirm}
              disabled={solved ? false : !selected || checking}
              className="w-full rounded-2xl py-3.5 text-base font-bold text-white disabled:opacity-40"
              style={{ background: "var(--sentence)" }}
            >
              {solved ? "Next →" : "Confirm"}
            </button>
            {solved && explanationIsLong && (
              <button
                type="button"
                onClick={() => setShowFullExplanation(true)}
                className="text-center text-sm font-medium underline"
                style={{ color: "var(--sentence)", opacity: 0.7 }}
              >
                Read full explanation →
              </button>
            )}
            {solved && !explanationIsLong && explanation && (
              <p className="text-center text-sm leading-relaxed" style={{ color: "var(--sentence)", opacity: 0.7 }}>
                {explanation}
              </p>
            )}
          </div>
        )
      ) : null}
    </div>
  );
}
